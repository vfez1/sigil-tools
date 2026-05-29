import { registerArchiveHooks } from "./utils/hooks.js";

console.log("[chat-archive] chat-archive.js executing");
Hooks.once("ready", registerArchiveHooks);
