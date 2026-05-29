import { isEnabled } from "../shared/enable.js";
import { registerHooks } from "./utils/hooks.js";

Hooks.on("ready", () => {
    if (!isEnabled("enableCharacterFeatures")) return;
    registerHooks();
});
