import { registerSettings } from "./utils/settings.js";
import { registerHooks } from "./utils/hooks.js";
import { isEnabled } from "../shared/enable.js";

Hooks.once("init", () => {
    registerSettings();
});

Hooks.once("ready", () => {
    if (!isEnabled("enableVisualAuras")) return;
    registerHooks();
});
