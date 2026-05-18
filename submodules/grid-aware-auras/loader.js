// Runs before dist/module.js so the enable check is ready when the IIFE executes.
(function () {
    window.__sigil_gaa_enabled = function () {
        // game.settings may not have the setting registered yet at script-load time,
        // so fall back to the raw world-settings array that Foundry pre-populates.
        try {
            return game.settings.get("sigil-tools", "enableGridAwareAuras") !== false;
        } catch {
            const raw = game.data?.settings?.find?.(s => s.key === "sigil-tools.enableGridAwareAuras");
            return raw ? raw.value !== false : true;
        }
    };

    // Inject a synthetic module entry so grid-aware-auras' compiled code can call
    // game.modules.get("grid-aware-auras").api = {...} without throwing.
    Hooks.once("init", function () {
        if (!window.__sigil_gaa_enabled()) return;
        if (!game.modules.has("grid-aware-auras")) {
            game.modules.set("grid-aware-auras", {
                id: "grid-aware-auras",
                title: "Grid-Aware Auras",
                version: "0.5.8",
                active: true,
                api: {},
                languages: new Set(),
            });
        }
    });
})();
