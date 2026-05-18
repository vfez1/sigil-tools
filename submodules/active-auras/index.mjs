import { extendEffectsForm } from "./app/aurasTab.mjs";
import { initHooks, readyHooks, socketLibReadyHooks } from "./hooks.mjs";
import { AAHelpers } from "./lib/AAHelpers.mjs";
import { AAMeasure } from "./lib/AAMeasure.mjs";
import { ActiveAuras } from "./lib/ActiveAuras.mjs";

function _isAAEnabled() {
    try {
        return game.settings.get("sigil-tools", "enableActiveAuras") !== false;
    } catch {
        return true;
    }
}

Hooks.on("init", initHooks);
Hooks.once("socketlib.ready", () => { if (_isAAEnabled()) socketLibReadyHooks(); });
Hooks.on("ready", () => { if (_isAAEnabled()) readyHooks(); });
Hooks.on("renderActiveEffectConfig", (...args) => { if (_isAAEnabled()) extendEffectsForm(...args); });

window.AAHelpers = AAHelpers;
window.AAhelpers = AAHelpers;
window.AAMeasure = AAMeasure;
window.AAmeasure = AAMeasure;
window.ActiveAuras = ActiveAuras;
