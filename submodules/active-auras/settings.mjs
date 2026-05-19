import { AAHelpers } from "./lib/AAHelpers.mjs";
import { CollateAuras } from "./lib/CollateAuras.mjs";

const NS = "sigil-tools";

export function settings() {
  foundry.utils.setProperty(CONFIG, "debug.AA", false);
  foundry.utils.setProperty(CONFIG, "AA.GM", false);
  foundry.utils.setProperty(CONFIG, "AA.Map", new Map());

  game.settings.register(NS, "measurement", {
    name: "Measurement System",
    hint: "Use system defined movement measurement rather than straight line (euclidean).",
    scope: "world", config: true, default: true, type: Boolean,
  });
  game.settings.register(NS, "wall-block", {
    name: "Walls Block Auras",
    hint: "Intervening walls will block aura effects.",
    scope: "world", config: true, default: false, type: Boolean,
  });
  game.settings.register(NS, "vertical-euclidean", {
    name: "Height Measurement System",
    hint: "How heights are measured for auras. On: simple height comparison. Off: euclidean distance (experimental).",
    scope: "world", config: true, default: true, type: Boolean,
  });
  game.settings.register(NS, "dead-aura", {
    name: "Remove Auras on Death",
    hint: "When a token reaches 0 HP, remove any auras it provides.",
    scope: "world", config: true, default: true, type: Boolean,
  });
  game.settings.register(NS, "remove-hidden-auras", {
    name: "Remove Auras on Hidden Tokens",
    hint: "When a token is hidden, remove any auras it provides.",
    scope: "world", config: true, default: true, type: Boolean,
  });
  game.settings.register(NS, "combatOnly", {
    name: "Auras in Combat Only",
    hint: "Only check auras while a combat is active. Improves performance outside of combat.",
    scope: "world", config: true, default: false, type: Boolean,
    onChange: () => {
      if (game.settings.get(NS, "combatOnly") === false) {
        CollateAuras(canvas.id, true, true, "settings change");
      } else {
        AAHelpers.RemoveAllAppliedAuras();
      }
    },
  });
  game.settings.register(NS, "scrollingAura", {
    name: "Disable Scrolling Text for Auras",
    hint: "Removes the Active Effect scrolling text for any applied aura.",
    scope: "world", config: true, default: true, type: Boolean,
  });
  game.settings.register(NS, "debug", {
    name: "Debug",
    hint: "Additional console logs for debugging Active Auras.",
    scope: "world", config: true, default: false, type: Boolean,
  });
  game.settings.register(NS, "ActiveGM", {
    scope: "world", config: false, default: null, type: String,
  });
}

export function getAASetting(key) {
  return game.settings.get(NS, key);
}
