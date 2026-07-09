import { isEnabled } from "../shared/enable.js";

const SETTING_KEY = "enableEffectAutocomplete";

export function registerEffectAutocompleteHooks() {
    if (!isEnabled(SETTING_KEY)) return;
    Hooks.on("renderActiveEffectConfig", onRenderActiveEffectConfig);
}

// ── Field list ────────────────────────────────────────────────────────────────

let _fields = null;

function getFields() {
    if (_fields) return _fields;

    const paths = new Set();

    // Walk the dnd5e actor data model schema to collect dot-paths
    const schema = game.system?.model?.Actor;
    if (schema) {
        for (const [actorType, model] of Object.entries(schema)) {
            collectPaths(model, "system", paths);
        }
    }

    // Supplement with common paths the schema walk may not surface (roll formulas, flags, etc.)
    const extras = [
        "system.attributes.ac.value",
        "system.attributes.ac.bonus",
        "system.attributes.hp.value",
        "system.attributes.hp.max",
        "system.attributes.hp.tempmax",
        "system.attributes.init.bonus",
        "system.attributes.init.value",
        "system.attributes.movement.walk",
        "system.attributes.movement.fly",
        "system.attributes.movement.swim",
        "system.attributes.movement.climb",
        "system.attributes.movement.burrow",
        "system.attributes.spelldc",
        "system.attributes.spellcasting",
        "system.attributes.exhaustion",
        "system.attributes.concentration.limit",
        "system.attributes.concentration.bonuses.save",
        "system.details.cr",
        "system.details.level",
        "system.traits.size",
        "ATL.width",
        "ATL.height",
        "ATL.light.bright",
        "ATL.light.dim",
        "ATL.light.angle",
        "ATL.light.color",
        "ATL.light.alpha",
        "ATL.sight.range",
        "flags.midi-qol.advantage.ability.all",
        "flags.midi-qol.advantage.attack.all",
        "flags.midi-qol.disadvantage.ability.all",
        "flags.midi-qol.disadvantage.attack.all",
        "flags.midi-qol.grants.advantage.attack.all",
        "flags.dnd5e.initiativeAdv",
        "flags.dnd5e.initiativeAlert",
        "flags.dnd5e.jackOfAllTrades",
        "flags.dnd5e.remarkableAthlete",
        "flags.dnd5e.tavernBrawlerFists",
    ];

    for (const path of extras) paths.add(path);

    // Also add ability/skill modifier paths from the live actor schemas
    for (const ability of ["str", "dex", "con", "int", "wis", "cha"]) {
        paths.add(`system.abilities.${ability}.value`);
        paths.add(`system.abilities.${ability}.proficient`);
        paths.add(`system.abilities.${ability}.bonuses.check`);
        paths.add(`system.abilities.${ability}.bonuses.save`);
    }

    for (const skill of ["acr","ani","arc","ath","dec","his","ins","itm","inv","med","nat","prc","prf","per","rel","slt","ste","sur"]) {
        paths.add(`system.skills.${skill}.value`);
        paths.add(`system.skills.${skill}.bonuses.check`);
        paths.add(`system.skills.${skill}.bonuses.passive`);
    }

    _fields = Array.from(paths).sort();
    return _fields;
}

function collectPaths(obj, prefix, out, depth = 0) {
    if (depth > 6 || obj === null || typeof obj !== "object") return;
    for (const [key, val] of Object.entries(obj)) {
        if (key.startsWith("_") || key === "schema") continue;
        const path = `${prefix}.${key}`;
        out.add(path);
        if (val && typeof val === "object" && !Array.isArray(val)) {
            collectPaths(val, path, out, depth + 1);
        }
    }
}

// ── Dropdown ──────────────────────────────────────────────────────────────────

class AttributeDropdown {
    constructor() {
        this.el = null;
        this.currentInput = null;
        this.filtered = [];
        this.selectedIndex = 0;
        this._onDocClick = this._handleDocumentClick.bind(this);
        this._onKeyDown = this._handleKeyDown.bind(this);
    }

    attach(input) {
        this.currentInput = input;
        input.addEventListener("input", () => this._update());
        input.addEventListener("click", () => this._update());
        input.addEventListener("focus", () => this._update());
    }

    _update() {
        const query = (this.currentInput?.value ?? "").toLowerCase();
        const all = getFields();
        this.filtered = query ? all.filter(p => p.toLowerCase().includes(query)) : all;
        this.selectedIndex = 0;
        this._render();
    }

    _render() {
        if (!this.el) this._createElement();

        if (this.filtered.length === 0) {
            this.el.style.display = "none";
            return;
        }

        this.el.innerHTML = "";
        const frag = document.createDocumentFragment();
        this.filtered.forEach((path, i) => {
            const item = document.createElement("div");
            item.className = "eac-option" + (i === 0 ? " selected" : "");
            item.textContent = path;
            item.dataset.index = i;
            item.addEventListener("mousedown", (e) => {
                e.preventDefault();
                this._apply(i);
            });
            frag.appendChild(item);
        });
        this.el.appendChild(frag);
        this.el.style.display = "block";
        this._position();
    }

    _createElement() {
        this.el = document.createElement("div");
        this.el.className = "eac-dropdown";
        document.body.appendChild(this.el);
        document.addEventListener("click", this._onDocClick);
        document.addEventListener("keydown", this._onKeyDown);
    }

    _position() {
        if (!this.currentInput || !this.el) return;
        const rect = this.currentInput.getBoundingClientRect();
        const maxH = Math.min(300, window.innerHeight - rect.bottom - 8);
        this.el.style.left = rect.left + "px";
        this.el.style.top = (rect.bottom + window.scrollY) + "px";
        this.el.style.width = Math.max(rect.width, 280) + "px";
        this.el.style.maxHeight = maxH + "px";
    }

    _select(index) {
        const items = this.el?.querySelectorAll(".eac-option");
        if (!items) return;
        items[this.selectedIndex]?.classList.remove("selected");
        this.selectedIndex = (index + this.filtered.length) % this.filtered.length;
        const next = items[this.selectedIndex];
        next?.classList.add("selected");
        next?.scrollIntoView({ block: "nearest" });
    }

    _apply(index) {
        const path = this.filtered[index];
        if (path && this.currentInput) {
            this.currentInput.value = path;
            this.currentInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
        this.hide();
    }

    hide() {
        if (this.el) this.el.style.display = "none";
    }

    destroy() {
        document.removeEventListener("click", this._onDocClick);
        document.removeEventListener("keydown", this._onKeyDown);
        this.el?.remove();
        this.el = null;
    }

    _handleDocumentClick(e) {
        if (!this.el) return;
        if (!this.el.contains(e.target) && e.target !== this.currentInput) {
            this.hide();
        }
    }

    _handleKeyDown(e) {
        if (!this.el || this.el.style.display === "none") return;
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                this._select(this.selectedIndex + 1);
                break;
            case "ArrowUp":
                e.preventDefault();
                this._select(this.selectedIndex - 1);
                break;
            case "Enter":
                e.preventDefault();
                this._apply(this.selectedIndex);
                break;
            case "Escape":
                e.preventDefault();
                this.hide();
                break;
            case "Tab":
                this.hide();
                break;
        }
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function onRenderActiveEffectConfig(app, html) {
    const el = html instanceof jQuery ? html[0] : html;
    const inputs = el.querySelectorAll('.tab[data-tab="changes"] input[type="text"]');
    if (!inputs.length) return;

    const dropdown = new AttributeDropdown();

    inputs.forEach(input => {
        // Only attach to the key column (first text input per row)
        const row = input.closest("li, tr, .effect-change");
        if (!row) return;
        const firstText = row.querySelector('input[type="text"]');
        if (input !== firstText) return;
        dropdown.attach(input);
    });

    // Reattach if the sheet re-renders (new row added etc.)
    const observer = new MutationObserver(() => {
        const newInputs = el.querySelectorAll('.tab[data-tab="changes"] input[type="text"]');
        newInputs.forEach(input => {
            if (input.dataset.eacAttached) return;
            const row = input.closest("li, tr, .effect-change");
            if (!row) return;
            const firstText = row.querySelector('input[type="text"]');
            if (input !== firstText) return;
            input.dataset.eacAttached = "1";
            dropdown.attach(input);
        });
    });
    observer.observe(el, { childList: true, subtree: true });

    // Cleanup on close
    app.element?.addEventListener("close", () => {
        observer.disconnect();
        dropdown.destroy();
    }, { once: true });
}
