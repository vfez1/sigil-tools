import { isEnabled } from "../shared/enable.js";

const SETTING_KEY = "enableEffectAutocomplete";

export function registerEffectAutocompleteHooks() {
    if (!isEnabled(SETTING_KEY)) return;
    Hooks.once("ready", () => initFields());
    Hooks.on("renderActiveEffectConfig", onRenderActiveEffectConfig);
}

// ── Field list ────────────────────────────────────────────────────────────────

let _fields = null;

async function initFields() {
    if (_fields) return;
    const data = await foundry.utils.fetchJsonWithTimeout(
        "modules/sigil-tools/submodules/effect-autocomplete/field-data.json"
    );
    const SKIP = new Set(["Hidden", "Macros"]);
    const paths = new Set();
    for (const [category, keys] of Object.entries(data)) {
        if (SKIP.has(category)) continue;
        for (const key of keys) paths.add(key);
    }
    _fields = Array.from(paths).sort();
}

function getFields() {
    return _fields ?? [];
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
        if (input.dataset.eacAttached) return;
        input.dataset.eacAttached = "1";
        input.addEventListener("input",  () => { this.currentInput = input; this._update(); });
        input.addEventListener("click",  () => { this.currentInput = input; this._update(); });
        input.addEventListener("focus",  () => { this.currentInput = input; this._update(); });
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
            Object.assign(item.style, {
                padding: "4px 8px",
                cursor: "pointer",
                color: i === 0 ? "#f0e6d2" : "#ccc",
                background: i === 0 ? "rgba(255,200,100,0.15)" : "transparent",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
            });
            item.addEventListener("mouseover", () => {
                item.style.background = "rgba(255,200,100,0.15)";
                item.style.color = "#f0e6d2";
            });
            item.addEventListener("mouseout", () => {
                if (!item.classList.contains("selected")) {
                    item.style.background = "transparent";
                    item.style.color = "#ccc";
                }
            });
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
        Object.assign(this.el.style, {
            position: "fixed",
            zIndex: "10000",
            background: "#1e1e1e",
            border: "1px solid #555",
            borderRadius: "4px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "0.8rem",
            display: "none",
        });
        document.body.appendChild(this.el);
        document.addEventListener("click", this._onDocClick);
        document.addEventListener("keydown", this._onKeyDown);
    }

    _position() {
        if (!this.currentInput || !this.el) return;
        const rect = this.currentInput.getBoundingClientRect();
        const maxH = Math.min(300, window.innerHeight - rect.bottom - 8);
        this.el.style.left = rect.left + "px";
        this.el.style.top = rect.bottom + "px";
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

function attachKeyInputs(el, dropdown) {
    const inputs = el.querySelectorAll('.tab[data-tab="changes"] input[type="text"]');
    inputs.forEach(input => {
        const row = input.closest("li, tr, .effect-change");
        if (!row) return;
        if (input !== row.querySelector('input[type="text"]')) return;
        dropdown.attach(input);
    });
}

function onRenderActiveEffectConfig(app, html) {
    const el = html instanceof jQuery ? html[0] : html;

    if (!app._eacDropdown) {
        app._eacDropdown = new AttributeDropdown();
        app.element?.addEventListener("close", () => {
            app._eacDropdown?.destroy();
            delete app._eacDropdown;
        }, { once: true });
    }

    attachKeyInputs(el, app._eacDropdown);
}
