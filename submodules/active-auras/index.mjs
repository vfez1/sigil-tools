import { extendEffectsForm } from "./app/aurasTab.mjs";
import { initHooks, readyHooks, socketLibReadyHooks } from "./hooks.mjs";
import { AAHelpers } from "./lib/AAHelpers.mjs";
import { AAMeasure } from "./lib/AAMeasure.mjs";
import { ActiveAuras } from "./lib/ActiveAuras.mjs";
import { isEnabled } from "../shared/enable.js";

Hooks.on("init", initHooks);
Hooks.once("socketlib.ready", () => { if (isEnabled("enableActiveAuras")) socketLibReadyHooks(); });
Hooks.on("ready", () => { if (isEnabled("enableActiveAuras")) readyHooks(); });
Hooks.on("renderActiveEffectConfig", (...args) => { if (isEnabled("enableActiveAuras")) extendEffectsForm(...args); });

window.AAHelpers = AAHelpers;
window.AAhelpers = AAHelpers;
window.AAMeasure = AAMeasure;
window.AAmeasure = AAMeasure;
window.ActiveAuras = ActiveAuras;
