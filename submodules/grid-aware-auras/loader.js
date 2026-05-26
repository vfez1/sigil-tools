// Runs before dist/module.js so the enable check is ready when the IIFE executes.

// Tracks which open TokenConfig apps have our Auras tab selected.
const _gaaTabActive = new Map();

function _injectGaaAuraTab(app, html) {
    const token = app.document;
    if (!token) return;

    let presets = [];
    try {
        presets = game.settings.get("sigil-tools", "presets") ?? [];
    } catch(e) {
        return;
    }

    const tabsNav = html.querySelector("nav[data-application-part='tabs']");
    if (!tabsNav) return;

    // Foundry rebuilds tabsNav on every re-render but leaves the old panel in the DOM.
    // Remove it so we don't accumulate duplicate panels.
    const contentEl = html.querySelector(".window-content");
    const stale = (contentEl ?? html).querySelector(".rm-gaa-pane");
    if (stale) stale.remove();

    const auras = token.flags?.["grid-aware-auras"]?.auras ?? [];

    // --- Tab nav entry ---
    const tabLink = document.createElement("a");
    tabLink.dataset.action = "tab";
    tabLink.dataset.group = "sheet";
    tabLink.dataset.tab = "gridawareauras";
    tabLink.innerHTML = `<i class="far fa-hexagon" inert=""></i><span>Auras</span>`;
    tabsNav.appendChild(tabLink);

    // --- Aura rows ---
    const auraRowsHtml = auras.map((a, i) => `
        <div class="rm-gaa-row" data-idx="${i}">
            <label class="rm-gaa-switch" title="${a.enabled !== false ? "Enabled" : "Disabled"}">
                <input type="checkbox" class="rm-gaa-cb" data-idx="${i}" ${a.enabled !== false ? "checked" : ""}>
                <span class="rm-gaa-switch-track"></span>
            </label>
            <span class="rm-gaa-col-name">${a.name ?? "Aura " + (i + 1)}</span>
            <span class="rm-gaa-col-radius">${a.radius ?? ""}</span>
            <span class="rm-gaa-col-swatch" style="background:${a.lineColor || "transparent"};${!a.lineColor ? "border:1px solid #555" : ""}"></span>
            <span class="rm-gaa-col-swatch" style="background:${a.fillColor || "transparent"};${!a.fillColor ? "border:1px solid #555" : ""}"></span>
            <button type="button" class="rm-gaa-remove" data-idx="${i}" title="Remove aura">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join("");

    // --- Panel ---
    // No `hidden` attribute — visibility is managed entirely via the `active` class + CSS.
    // Using `hidden` conflicts with Foundry's own `_activateTab` which only toggles `active`.
    const panel = document.createElement("div");
    panel.className = "tab rm-gaa-pane";
    panel.dataset.group = "sheet";
    panel.dataset.tab = "gridawareauras";
    panel.innerHTML = `
        <div class="rm-gaa-scroll">
            <div class="rm-gaa-table">
                <div class="rm-gaa-table-header">
                    <span class="rm-gaa-col-toggle"></span>
                    <span class="rm-gaa-col-name"></span>
                    <span class="rm-gaa-col-radius">Radius</span>
                    <span class="rm-gaa-col-swatch">Line</span>
                    <span class="rm-gaa-col-swatch">Fill</span>
                    <span class="rm-gaa-col-action">
                        <button type="button" class="rm-gaa-add-btn" title="Add aura from preset">
                            <i class="fas fa-plus"></i>
                        </button>
                    </span>
                </div>
                <div class="rm-gaa-group-label">Token</div>
                <div class="rm-gaa-rows">
                    ${auraRowsHtml || `<div class="rm-gaa-empty">No auras on this token.</div>`}
                </div>
            </div>
        </div>
    `;

    // --- Dropdown — appended to body so Foundry's window transforms don't trap it ---
    const dropdown = document.createElement("div");
    dropdown.className = "rm-gaa-dropdown";
    dropdown.hidden = true;
    dropdown.innerHTML = presets.map((p, i) => `
        <div class="rm-gaa-dropdown-item" data-pidx="${i}">${p.config?.name ?? "Preset " + (i + 1)}</div>
    `).join("") || `<div class="rm-gaa-dropdown-item rm-gaa-dropdown-empty">No presets defined</div>`;
    document.body.appendChild(dropdown);

    // Insert panel before the footer, inside .window-content
    const footer = contentEl?.querySelector(".form-footer");
    const lastDivTab = [...(contentEl ?? html).querySelectorAll("div.tab[data-group='sheet']")].at(-1);
    if (lastDivTab) lastDivTab.after(panel);
    else if (footer) footer.before(panel);
    else (contentEl ?? html).appendChild(panel);

    // Use token ID as key so the "Auras tab was active" state survives close/reopen
    // of the same token config within the same session.
    const tokenKey = token.uuid ?? token.id;

    // --- Tab switching ---
    function _activateOurTab() {
        (contentEl ?? html).querySelectorAll(".tab[data-group='sheet']").forEach(s => {
            if (s.dataset.tab !== "gridawareauras") s.classList.remove("active");
        });
        panel.classList.add("active");
        tabsNav.querySelectorAll("[data-tab]").forEach(a => {
            a.classList.toggle("active", a.dataset.tab === "gridawareauras");
        });
    }

    // Watch for Foundry adding `active` to our tab link (handles first-ever open where
    // Foundry restores a persisted tab state from a previous session).
    const tabObs = new MutationObserver(() => {
        if (tabLink.classList.contains("active") && !panel.classList.contains("active")) {
            _activateOurTab();
        }
    });
    tabObs.observe(tabLink, { attributes: true, attributeFilter: ["class"] });

    if (_gaaTabActive.get(tokenKey)) {
        // User was on Auras tab last time this token config was open — restore it.
        setTimeout(_activateOurTab, 0);
    }

    tabLink.addEventListener("click", () => {
        _gaaTabActive.set(tokenKey, true);
        setTimeout(_activateOurTab, 0);
    });
    tabsNav.querySelectorAll("[data-tab]:not([data-tab='gridawareauras'])").forEach(a => {
        a.addEventListener("click", () => {
            // User explicitly navigated away — clear so next open starts on that tab.
            _gaaTabActive.delete(tokenKey);
            panel.classList.remove("active");
        });
    });
    // On close: keep tokenKey in map so re-open restores the tab.
    // Only drop the dropdown element and stop observing the (now-detached) tab link.
    Hooks.once(`close${app.constructor.name}`, () => {
        dropdown.remove();
        tabObs.disconnect();
    });

    // --- + dropdown ---
    const addBtn = panel.querySelector(".rm-gaa-add-btn");
    addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dropdown.hidden) {
            const rect = addBtn.getBoundingClientRect();
            dropdown.style.top = (rect.bottom + 2) + "px";
            dropdown.style.left = Math.max(8, rect.right - 182) + "px";
            dropdown.hidden = false;
        } else {
            dropdown.hidden = true;
        }
    });
    document.addEventListener("click", (e) => {
        if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== addBtn) {
            dropdown.hidden = true;
        }
    }, { capture: false });

    dropdown.querySelectorAll(".rm-gaa-dropdown-item:not(.rm-gaa-dropdown-empty)").forEach(item => {
        item.addEventListener("click", async (e) => {
            e.stopPropagation();
            const pidx = parseInt(e.currentTarget.dataset.pidx);
            const preset = presets[pidx];
            if (!preset) return;
            dropdown.hidden = true;
            const updated = foundry.utils.deepClone(token.flags?.["grid-aware-auras"]?.auras ?? []);
            const newAura = foundry.utils.deepClone(preset.config);
            newAura.id = foundry.utils.randomID();
            newAura.enabled = true;
            updated.push(newAura);
            await token.update({ "flags.grid-aware-auras.auras": updated });
        });
    });

    // --- Toggle enable/disable ---
    panel.querySelectorAll(".rm-gaa-cb").forEach(cb => {
        cb.addEventListener("change", async (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const updated = foundry.utils.deepClone(token.flags?.["grid-aware-auras"]?.auras ?? []);
            if (!updated[idx]) return;
            updated[idx].enabled = e.target.checked;
            await token.update({ "flags.grid-aware-auras.auras": updated });
        });
    });

    // --- Remove aura ---
    panel.querySelectorAll(".rm-gaa-remove").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            const updated = foundry.utils.deepClone(token.flags?.["grid-aware-auras"]?.auras ?? []);
            updated.splice(idx, 1);
            await token.update({ "flags.grid-aware-auras.auras": updated });
        });
    });

}

Hooks.on("renderTokenConfig", (app, html) => _injectGaaAuraTab(app, html));

Hooks.on("renderSettingsConfig", function(app, html) {
    const el = html instanceof $ ? html[0] : html;
    const section = el.querySelector('section[data-tab="sigil-tools"]');
    if (!section) return;

    const HEADER_STYLE = [
        "display:flex", "align-items:center", "gap:6px",
        "background:linear-gradient(to right,rgba(150,40,30,0.7),transparent)",
        "border-left:4px solid #e03020",
        "padding:8px 12px", "margin:1.4em 0 0.3em",
        "font-size:1.25em", "text-transform:uppercase",
        "letter-spacing:0.06em", "font-weight:bold", "color:#f0e6d2"
    ].join(";");

    const HR_STYLE = "border:none;border-top:1px solid var(--color-border-light-tertiary,#c9c7b8);margin:0.5em 0 0;";

    function makeHeader(icon, label) {
        const h = document.createElement("div");
        h.style.cssText = HEADER_STYLE;
        h.innerHTML = `<i class="${icon}" style="width:14px;text-align:center;opacity:0.8"></i> ${label}`;
        return h;
    }

    function insertHeader(anchorGroup, icon, label) {
        if (!anchorGroup) return;
        const hr = document.createElement("hr");
        hr.style.cssText = HR_STYLE;
        anchorGroup.before(hr, makeHeader(icon, label));
    }

    // — Roll Model —
    const firstRmGroup = section.querySelector('[name="sigil-tools.preventMovementHistory"]')?.closest(".form-group");
    if (firstRmGroup) firstRmGroup.before(makeHeader("fas fa-dice-d20", "Roll Model"));

    // — Grid-Aware Auras —
    const firstGaaGroup = section.querySelector('button[data-action="openSubmenu"][data-key="sigil-tools.presets"]')?.closest(".form-group");
    insertHeader(firstGaaGroup, "fas fa-hexagon", "Grid-Aware Auras");

    // — Character Features — button lands mid-GAA in the DOM, so move it to just before Active Auras
    const cfGroup = section.querySelector('button[data-action="openSubmenu"][data-key="sigil-tools.characterFeaturesSetup"]')?.closest(".form-group");
    const firstAAGroup = section.querySelector('[name="sigil-tools.measurement"]')?.closest(".form-group");
    if (cfGroup && firstAAGroup) {
        const cfHr = document.createElement("hr");
        cfHr.style.cssText = HR_STYLE;
        firstAAGroup.before(cfHr, makeHeader("fas fa-user", "Character Features"), cfGroup);
    }

    // — Active Auras —
    insertHeader(firstAAGroup, "fas fa-circle-dashed", "Active Auras");

    // — Submodules (enable toggles) — moved to bottom
    const toggleKeys = ["enableRollModel", "enableActiveAuras", "enableOverrideSettings", "enableSuppressWarnings", "enableGridAwareAuras", "enableEffectMacro", "enableCharacterFeatures"];
    const toggleGroups = toggleKeys
        .map(k => section.querySelector(`[name="sigil-tools.${k}"]`)?.closest(".form-group"))
        .filter(Boolean);

    if (toggleGroups.length) {
        const hr = document.createElement("hr");
        hr.style.cssText = HR_STYLE;
        section.append(hr, makeHeader("fas fa-puzzle-piece", "Submodules"), ...toggleGroups);
    }
});

(function () {
    window.__sigil_gaa_enabled = function () {
        // game.settings may not have the setting registered yet at script-load time,
        // so fall back to the raw world-settings array that Foundry pre-populates.
        try {
            return game.settings.get("sigil-tools", "enableGridAwareAuras") !== false;
        } catch {
            const raw = game.data?.settings?.find?.(s => s.key === "sigil-tools.enableGridAwareAuras");
            return raw ? raw.value !== false && raw.value !== "false" : true;
        }
    };
})();
