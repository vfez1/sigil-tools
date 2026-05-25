import { isEnabled } from "../shared/enable.js";
import { registerSettings } from "./utils/settings.js";
import { registerHooks } from "./utils/hooks.js";

Hooks.once("init", () => {
    registerSettings();
});

Hooks.on("ready", () => {
    if (!isEnabled("enableCharacterFeatures")) return;
    registerHooks();
});
