const SETTINGS = {
  measurement: true,
  "wall-block": false,
  "vertical-euclidean": true,
  "dead-aura": true,
  "remove-hidden-auras": true,
  combatOnly: false,
  scrollingAura: true,
  debug: false,
};

export function settings() {
  foundry.utils.setProperty(CONFIG, "debug.AA", SETTINGS.debug);
  foundry.utils.setProperty(CONFIG, "AA.GM", false);
  foundry.utils.setProperty(CONFIG, "AA.Map", new Map());
  foundry.utils.setProperty(CONFIG, "AA.Settings", { ...SETTINGS });
}

export function getAASetting(key) {
  return foundry.utils.getProperty(CONFIG, `AA.Settings.${key}`);
}
