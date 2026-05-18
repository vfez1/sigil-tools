// Runs before dist/module.js so the enable check is ready when the IIFE executes.
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
