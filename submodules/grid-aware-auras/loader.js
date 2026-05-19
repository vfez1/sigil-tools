// Runs before dist/module.js so the enable check is ready when the IIFE executes.

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

    // — Active Auras —
    const firstAAGroup = section.querySelector('[name="sigil-tools.measurement"]')?.closest(".form-group");
    insertHeader(firstAAGroup, "fas fa-circle-dashed", "Active Auras");

    // — Submodules (enable toggles) — moved to bottom
    const toggleKeys = ["enableRollModel", "enableActiveAuras", "enableOverrideSettings", "enableSuppressWarnings", "enableGridAwareAuras"];
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
