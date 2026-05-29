import { registerArchiveSettings } from "./utils/settings.js";
import { registerArchiveHooks } from "./utils/hooks.js";

Hooks.once("init", registerArchiveSettings);
Hooks.once("ready", registerArchiveHooks);
