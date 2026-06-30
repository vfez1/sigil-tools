export function registerSettingsPanelHooks() {
    Hooks.on("renderSettingsConfig", (app, html) => {
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

        function group(key) {
            return (
                section.querySelector(`[name="sigil-tools.${key}"]`)?.closest(".form-group") ??
                section.querySelector(`button[data-key="sigil-tools.${key}"]`)?.closest(".form-group")
            );
        }

        // Foundry renders all registerMenu buttons before regular settings. Active-auras also
        // registers its settings before sigil-tools, so the raw DOM order doesn't match the
        // desired layout. Reorder physically: Visual Auras → Active Auras → Roll Model →
        // Character Features → Chat Archive → Submodules.
        let anchor = group("visualAurasActorConfig");

        for (const key of ["measurement", "wall-block", "vertical-euclidean", "dead-aura", "remove-hidden-auras", "combatOnly", "scrollingAura", "debug"]) {
            const g = group(key);
            if (g) { anchor.after(g); anchor = g; }
        }

        for (const key of ["collapseSettings", "preventMovementHistory", "showTurnStartMarker", "acknowledgedMode"]) {
            const g = group(key);
            if (g) { anchor.after(g); anchor = g; }
        }

        const cfSetup = group("characterFeaturesSetup");
        if (cfSetup) { anchor.after(cfSetup); anchor = cfSetup; }

        for (const key of ["chatArchiveUrl", "chatArchiveKeepCount"]) {
            const g = group(key);
            if (g) { anchor.after(g); anchor = g; }
        }

        // Move combat-tracker-dock settings before the submodule toggles.
        const submodulesAnchor = group("enableActiveAuras");
        if (submodulesAnchor) {
            for (const key of ["attributesMenu", "direction", "portraitSize", "lessButtons", "overflowStyle", "carouselStyle", "alignment", "floatingSize", "portraitAspect", "roundness", "attributeColor", "attributeColor2", "attributeColorPortrait", "barsPlacement", "attributeVisibility", "hideDefeated", "showDispositionColor", "showInitiativeOnPortrait", "portraitImage", "displayName", "playerPlayerPermission", "hideFirstRound", "hideEnemyInitiative", "portraitImageBorder", "portraitImageBackground", "showSystemIcons", "hideConflictingUIs", "resource", "portraitResource"]) {
                const g = group(key);
                if (g) submodulesAnchor.before(g);
            }
        }

        insertHeader(group("visualAurasSetup"),       "fas fa-circle-dashed", "Visual Auras");
        insertHeader(group("measurement"),            "fas fa-circle-dashed", "Active Auras");
        insertHeader(group("collapseSettings"),       "fas fa-dice-d20",      "Roll Model");
        insertHeader(group("characterFeaturesSetup"), "fas fa-user",          "Character Features");
        insertHeader(group("chatArchiveUrl"),         "fas fa-box-archive",   "Chat Archive");
        insertHeader(group("attributesMenu"),         "fas fa-swords",        "Combat Tracker Dock");
        insertHeader(group("enableActiveAuras"),      "fas fa-puzzle-piece",  "Submodules");
    });
}
