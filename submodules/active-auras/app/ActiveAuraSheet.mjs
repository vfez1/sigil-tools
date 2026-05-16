import CONSTANTS from "../constants.mjs";
import { aaLocalize } from "../labels.mjs";

function getExtendedParts(origParts) {
  return Object.fromEntries(Object.entries(origParts)
    .toSpliced(-1, 0, ["activeauras", { template: "modules/sigil-tools/templates/active-auras-config.hbs" }]));
}

function getExtendedTabs(origTabs) {
  return {
    sheet: {
      ...origTabs.sheet,
      tabs: [
        ...origTabs.sheet.tabs,
        { id: "activeauras", icon: "fa-thin fa-person-rays", label: "Active Auras" }
      ]
    }
  };
}

// Direct property read bypasses Foundry's flag scope validation,
// which requires the scope to match a registered module ID.
function _getAuraFlag(document, key, defaultVal) {
  return document.flags?.[CONSTANTS.MODULE_NAME]?.[key] ?? defaultVal;
}

function getSchema(document) {

  const { BooleanField, StringField, SetField } = foundry.data.fields;

  const schema = {
    isAura: {
      field: new BooleanField({
        label: aaLocalize("ACTIVEAURAS.FORM_IsAura"),
        initial: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.isAura`,
      value: _getAuraFlag(document, "isAura", false),
    },
    aura: {
      field: new StringField({
        label: aaLocalize("ACTIVEAURAS.FORM_TargetsName"),
        initial: "All",
        required: true,
        blank: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.aura`,
      value: _getAuraFlag(document, "aura", "All"),
      options: [
        { value: "Enemy", label: aaLocalize("ACTIVEAURAS.FORM_TargetsEnemy") },
        { value: "Allies", label: aaLocalize("ACTIVEAURAS.FORM_TargetsAllies") },
        { value: "All", label: aaLocalize("ACTIVEAURAS.FORM_TargetsAll") },
      ],
    },
    nameOverride: {
      field: new StringField({
        label: aaLocalize("ACTIVEAURAS.FORM_NameOverride"),
        initial: "",
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.nameOverride`,
      value: _getAuraFlag(document, "nameOverride", ""),
    },
    radius: {
      field: new StringField({
        label: aaLocalize("ACTIVEAURAS.FORM_Radius"),
        initial: "",
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.radius`,
      value: _getAuraFlag(document, "radius", ""),
      placeholder: aaLocalize("ACTIVEAURAS.FORM_RadiusPrompt"),
    },
    alignment: {
      field: new StringField({
        label: aaLocalize("ACTIVEAURAS.FORM_Alignment"),
        initial: "",
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.alignment`,
      value: _getAuraFlag(document, "alignment", ""),
      options: [
        { value: "", label: "" },
        { value: "good", label: aaLocalize("ACTIVEAURAS.FORM_Good") },
        { value: "neutral", label: aaLocalize("ACTIVEAURAS.FORM_Neutral") },
        { value: "evil", label: aaLocalize("ACTIVEAURAS.FORM_Evil") },
      ]
    },
    type: {
      field: new StringField({
        label: (game.system.id === "demonlord") ? aaLocalize("ACTIVEAURAS.FORM_TypeDemonlord") : aaLocalize("ACTIVEAURAS.FORM_Type"),
        initial: "",
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.type`,
      value: _getAuraFlag(document, "type", ""),
      placeholder: aaLocalize("ACTIVEAURAS.FORM_TypePrompt"),
    },
    customCheck: {
      field: new StringField({
        label: aaLocalize("ACTIVEAURAS.FORM_CustomCondition"),
        initial: "",
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.customCheck`,
      value: _getAuraFlag(document, "customCheck", ""),
      placeholder: aaLocalize("ACTIVEAURAS.FORM_CustomConditionPrompt"),
    },
    ignoreSelf: {
      field: new BooleanField({
        label: aaLocalize("ACTIVEAURAS.FORM_IgnoreSelf"),
        initial: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.ignoreSelf`,
      value: _getAuraFlag(document, "ignoreSelf", false),
    },
    height: {
      field: new BooleanField({
        label: aaLocalize("ACTIVEAURAS.FORM_Height"),
        initial: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.height`,
      value: _getAuraFlag(document, "height", false),
    },
    hidden: {
      field: new BooleanField({
        label: aaLocalize("ACTIVEAURAS.FORM_Hidden"),
        initial: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.hidden`,
      value: _getAuraFlag(document, "hidden", false),
    },
    displayTemp: {
      field: new BooleanField({
        label: aaLocalize("ACTIVEAURAS.FORM_Temporary"),
        initial: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.displayTemp`,
      value: _getAuraFlag(document, "displayTemp", false),
    },
    hostile: {
      field: new BooleanField({
        label: aaLocalize("ACTIVEAURAS.FORM_HostileTurn"),
        initial: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.hostile`,
      value: _getAuraFlag(document, "hostile", false),
    },
    onlyOnce: {
      field: new BooleanField({
        label: aaLocalize("ACTIVEAURAS.FORM_ActivateOnce"),
        initial: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.onlyOnce`,
      value: _getAuraFlag(document, "onlyOnce", false),
    },
    wallsBlock: {
      field: new StringField({
        label: aaLocalize("ACTIVEAURAS.FORM_WallsBlock"),
        initial: "system",
        required: true,
        blank: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.wallsBlock`,
      value: _getAuraFlag(document, "wallsBlock", "system"),
      options: [
        { value: "system", label: aaLocalize("ACTIVEAURAS.FORM_SystemWallsBlock") },
        { value: "true", label: aaLocalize("ACTIVEAURAS.FORM_WallsDoBlock") },
        { value: "false", label: aaLocalize("ACTIVEAURAS.FORM_WallsDontBlock") },
      ],
    },
    statuses: {
      field: new SetField(new StringField({
        blank: false,
      }), {
        label: aaLocalize("ACTIVEAURAS.FORM_StatusConditions"),
        initial: [],
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.statuses`,
      value: _getAuraFlag(document, "statuses", []),
      options: CONFIG.statusEffects.map((s) => {
        return {
          value: s.id,
          label: game.i18n.localize(s.name),
        };
      }),
    },
  };

  if (game.system.id === "swade") {
    schema["wildcard"] = {
      field: new BooleanField({
        label: aaLocalize("ACTIVEAURAS.FORM_Wildcard"),
        initial: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.wildcard`,
      value: _getAuraFlag(document, "wildcard", false),
    };
    schema["extra"] = {
      field: new BooleanField({
        label: aaLocalize("ACTIVEAURAS.FORM_Extra"),
        initial: false,
      }),
      name: `flags.${CONSTANTS.MODULE_NAME}.extra`,
      value: _getAuraFlag(document, "extra", false),
    };
  }

  return schema;
}

async function _preparePartContext(wrapped, ...args) {
  let context = await wrapped(...args);

  if (args[0] === "activeauras") {
    context.activeAuras = getSchema(this.document);
    context.activeAuras.applied = _getAuraFlag(this.document, "applied", false);
    context.activeAuras.swade = game.system.id === "swade";
    context.activeAuras.demonlord = game.system.id === "demonlord";
  }
  return context;
};


function _onRender(wrapped, ...args) {
  this.element.querySelectorAll("fieldset#activeauras-isaura :is(input)").forEach((checkbox) => {
    checkbox.addEventListener("change", async (event) => {
      const checked = event.target.checked;
      const detailsFieldset = this.element.querySelector("fieldset#activeauras-details");
      detailsFieldset.style.display = checked ? "" : "none";
    });
  });

  return wrapped(...args);
}


export function extendAESheet() {
  if (!foundry.utils.isNewerVersion(game.version ?? "", "13")) return;

  foundry.applications.sheets.ActiveEffectConfig.PARTS = getExtendedParts(foundry.applications.sheets.ActiveEffectConfig.PARTS);
  foundry.applications.sheets.ActiveEffectConfig.TABS = getExtendedTabs(foundry.applications.sheets.ActiveEffectConfig.TABS);

  libWrapper.register(
    CONSTANTS.MODULE_ID,
    "foundry.applications.sheets.ActiveEffectConfig.prototype._preparePartContext",
    _preparePartContext,
    "WRAPPER"
  );

  libWrapper.register(
    CONSTANTS.MODULE_ID,
    "foundry.applications.sheets.ActiveEffectConfig.prototype._onRender",
    _onRender,
    "WRAPPER"
  );

  // add post setup for DAE
  Hooks.on("ready", () => {
    if (CONFIG.ActiveEffect.sheetClasses.base["core.DAEActiveEffectConfig"]){
      CONFIG.ActiveEffect.sheetClasses.base["core.DAEActiveEffectConfig"].cls.PARTS = getExtendedParts(CONFIG.ActiveEffect.sheetClasses.base["core.DAEActiveEffectConfig"].cls.PARTS);

      libWrapper.register(
        CONSTANTS.MODULE_ID,
        "CONFIG.ActiveEffect.sheetClasses.base['core.DAEActiveEffectConfig'].cls.prototype._onRender",
        _onRender,
        "WRAPPER"
      );
    }

    // demonlord
    if (CONFIG.ActiveEffect.sheetClasses.base["demonlord.DLActiveEffectConfig"]){
      CONFIG.ActiveEffect.sheetClasses.base["demonlord.DLActiveEffectConfig"].cls.PARTS = getExtendedParts(CONFIG.ActiveEffect.sheetClasses.base["demonlord.DLActiveEffectConfig"].cls.PARTS);

      libWrapper.register(
        CONSTANTS.MODULE_ID,
        "CONFIG.ActiveEffect.sheetClasses.base['demonlord.DLActiveEffectConfig'].cls.prototype._onRender",
        _onRender,
        "WRAPPER"
      );
    }
  });

}
