import { HooksUtility } from "./utils/hooks.js";
import "../active-auras/index.mjs";
import "../character-features/character-features.js";
import "../visual-auras/visual-auras.js";
import "../chat-archive/chat-archive.js";
import { registerEffectAutocompleteHooks } from "../effect-autocomplete/effect-autocomplete.js";

HooksUtility.registerModuleHooks();
