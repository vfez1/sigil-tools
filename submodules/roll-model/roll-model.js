import { HooksUtility } from "./utils/hooks.js";
import "../active-auras/index.mjs";
import "../character-features/character-features.js";
import "../visual-auras/visual-auras.js";
import "../chat-archive/chat-archive.js";
import "../effect-autocomplete/effect-autocomplete.js";
import "../ascendant-focus/ascendant-focus.js";

HooksUtility.registerModuleHooks();
