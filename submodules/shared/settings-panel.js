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

        const firstRmGroup = section.querySelector('[name="sigil-tools.preventMovementHistory"]')?.closest(".form-group");
        const firstVaGroup = section.querySelector('button[data-action="openSubmenu"][data-key="sigil-tools.visualAurasSetup"]')?.closest(".form-group");

        // Collect all Roll Model form-groups (everything from firstRmGroup up to firstVaGroup)
        const rmGroups = [];
        if (firstRmGroup && firstVaGroup) {
            let el = firstRmGroup;
            while (el && el !== firstVaGroup) {
                if (el.classList?.contains("form-group")) rmGroups.push(el);
                el = el.nextElementSibling;
            }
        }

        // Explicitly collect RM-owned menu buttons that fall outside the loop range
        // (registered after VA settings in the init hook order, so they land after firstVaGroup in the DOM)
        const rmMenuKeys = ["sigil-tools.collapseSettings"];
        for (const key of rmMenuKeys) {
            const g = section.querySelector(`button[data-key="${key}"]`)?.closest(".form-group");
            if (g && !rmGroups.includes(g)) rmGroups.push(g);
        }

        insertHeader(firstVaGroup, "fas fa-circle-dashed", "Visual Auras");

        const cfGroup = section.querySelector('button[data-action="openSubmenu"][data-key="sigil-tools.characterFeaturesSetup"]')?.closest(".form-group");
        const firstAAGroup = section.querySelector('[name="sigil-tools.measurement"]')?.closest(".form-group");

        // Insert Roll Model then Character Features as one block before Active Auras
        if (firstAAGroup) {
            const nodes = [];
            if (rmGroups.length) {
                const hr = document.createElement("hr");
                hr.style.cssText = HR_STYLE;
                nodes.push(hr, makeHeader("fas fa-dice-d20", "Roll Model"), ...rmGroups);
            }
            if (cfGroup) {
                const cfHr = document.createElement("hr");
                cfHr.style.cssText = HR_STYLE;
                nodes.push(cfHr, makeHeader("fas fa-user", "Character Features"), cfGroup);
            }
            if (nodes.length) firstAAGroup.before(...nodes);
        }

        insertHeader(firstAAGroup, "fas fa-circle-dashed", "Active Auras");

        const toggleKeys = [
            "enableActiveAuras",
            "enableCharacterFeatures",
            "enableEffectMacro",
            "enableOverrideSettings",
            "enableRollModel",
            "enableSuppressWarnings",
            "enableVisualAuras",
        ];
        const toggleGroups = toggleKeys
            .map(k => section.querySelector(`[name="sigil-tools.${k}"]`)?.closest(".form-group"))
            .filter(Boolean);

        if (toggleGroups.length) {
            const hr = document.createElement("hr");
            hr.style.cssText = HR_STYLE;
            section.append(hr, makeHeader("fas fa-puzzle-piece", "Submodules"), ...toggleGroups);
        }
    });
}
