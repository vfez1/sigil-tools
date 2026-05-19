import * as applications from "./applications/_module.mjs";
import * as hooks from "./hooks/_module.mjs";
import * as utils from "./utils/utils.mjs";
import * as triggers from "./triggers/_module.mjs";
import { isEnabled } from "../../shared/enable.js";

globalThis.effectmacro = {
  id: "effectmacro",
  applications,
  utils,
};

Hooks.once("init", () => {
  if (!isEnabled("enableEffectMacro")) return;

  // Run the init handler directly (we're already inside init)
  hooks.init();

  // Register all other hooks
  for (const [hook, fn] of Object.entries(hooks)) {
    if (hook !== "init") Hooks.on(hook, fn);
  }

  triggers.combat();
  triggers.effect();
  for (const sys of Object.values(triggers.systems)) Hooks.once("setup", sys);
});
