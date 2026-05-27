import { registerSettings } from "./utils/settings.js";
import { registerHooks } from "./utils/hooks.js";
import { isEnabled } from "../shared/enable.js";

Hooks.once("init", () => {
    registerSettings();
});

Hooks.once("ready", () => {
    if (!isEnabled("enableVisualAuras")) return;
    registerHooks();

    // Inject a "Visual Auras" tab into all token config sheet classes
    const patchedTypes = new Set();
    const patchTokenConfig = cls => {
        if (!cls) return;
        if (!(cls.prototype instanceof foundry.applications.api.ApplicationV2)) return;
        if (patchedTypes.has(cls)) return;

        // Add tab entry
        cls.TABS ??= {};
        cls.TABS.sheet ??= { tabs: [] };
        cls.TABS.sheet.tabs.push({ id: "visualAuras", label: "Auras", icon: "fas fa-circle-dashed" });

        // Add part — insert before footer so it renders in the right place
        const footer = cls.PARTS.footer;
        delete cls.PARTS.footer;
        cls.PARTS.visualAuras = {
            template: "modules/sigil-tools/submodules/visual-auras/templates/token-aura-config.hbs",
            scrollable: [],
        };
        if (footer) cls.PARTS.footer = footer;

        patchedTypes.add(cls);
    };

    for (const modelType of Object.values(CONFIG.Token.sheetClasses))
        for (const sheetConfig of Object.values(modelType))
            patchTokenConfig(sheetConfig.cls);
    patchTokenConfig(CONFIG.Token.prototypeSheetClass);
});
