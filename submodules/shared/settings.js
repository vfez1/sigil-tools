import { MODULE_NAME, MODULE_SHORT } from "./const.js";
import { CollapseSettingsApp } from "../roll-model/apps/CollapseSettingsApp.js";

/**
 * Enumerable of identifiers for setting names.
 * Keep these values stable so existing world settings continue to apply.
 * @enum {String}
 */
export const SETTING_NAMES = {
    PREVENT_MOVEMENT_HISTORY: "preventMovementHistory",
    SHOW_TURN_START_MARKER: "showTurnStartMarker",
    ACK_MODE: "acknowledgedMode",
    COLLAPSE_DESCRIPTION_EXCEPTIONS: "collapseDescriptionExceptions",
    ENABLE_ROLL_MODEL: "enableRollModel",
    ENABLE_ACTIVE_AURAS: "enableActiveAuras",
    ENABLE_OVERRIDE_SETTINGS: "enableOverrideSettings",
    ENABLE_SUPPRESS_WARNINGS: "enableSuppressWarnings",
    ENABLE_EFFECT_MACRO: "enableEffectMacro",
    ENABLE_CHARACTER_FEATURES: "enableCharacterFeatures",
    ENABLE_VISUAL_AURAS: "enableVisualAuras",
};

function localize(key) {
    return game.i18n.localize(key);
}

function settingLabel(settingKey, suffix) {
    return localize(`${MODULE_SHORT}.settings.${settingKey}.${suffix}`);
}

/**
 * Utility class for registry of Sigil Tools settings and retrieval of setting data.
 */
export class SettingsUtility {
    /**
     * Registers all shared module settings.
     */
    static registerSettings() {
        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_ROLL_MODEL, {
            name: settingLabel(SETTING_NAMES.ENABLE_ROLL_MODEL, "name"),
            hint: settingLabel(SETTING_NAMES.ENABLE_ROLL_MODEL, "hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_ACTIVE_AURAS, {
            name: settingLabel(SETTING_NAMES.ENABLE_ACTIVE_AURAS, "name"),
            hint: settingLabel(SETTING_NAMES.ENABLE_ACTIVE_AURAS, "hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_OVERRIDE_SETTINGS, {
            name: settingLabel(SETTING_NAMES.ENABLE_OVERRIDE_SETTINGS, "name"),
            hint: settingLabel(SETTING_NAMES.ENABLE_OVERRIDE_SETTINGS, "hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_SUPPRESS_WARNINGS, {
            name: settingLabel(SETTING_NAMES.ENABLE_SUPPRESS_WARNINGS, "name"),
            hint: settingLabel(SETTING_NAMES.ENABLE_SUPPRESS_WARNINGS, "hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_EFFECT_MACRO, {
            name: settingLabel(SETTING_NAMES.ENABLE_EFFECT_MACRO, "name"),
            hint: settingLabel(SETTING_NAMES.ENABLE_EFFECT_MACRO, "hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_CHARACTER_FEATURES, {
            name: settingLabel(SETTING_NAMES.ENABLE_CHARACTER_FEATURES, "name"),
            hint: settingLabel(SETTING_NAMES.ENABLE_CHARACTER_FEATURES, "hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_VISUAL_AURAS, {
            name: settingLabel(SETTING_NAMES.ENABLE_VISUAL_AURAS, "name"),
            hint: settingLabel(SETTING_NAMES.ENABLE_VISUAL_AURAS, "hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.keybindings.register(MODULE_NAME, "rollVersatile", {
            name: localize(`${MODULE_SHORT}.keybindings.rollVersatile.name`),
            hint: localize(`${MODULE_SHORT}.keybindings.rollVersatile.hint`),
            editable: [{ key: "KeyV" }],
            precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.PREVENT_MOVEMENT_HISTORY, {
            name: settingLabel(SETTING_NAMES.PREVENT_MOVEMENT_HISTORY, "name"),
            hint: settingLabel(SETTING_NAMES.PREVENT_MOVEMENT_HISTORY, "hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.SHOW_TURN_START_MARKER, {
            name: settingLabel(SETTING_NAMES.SHOW_TURN_START_MARKER, "name"),
            hint: settingLabel(SETTING_NAMES.SHOW_TURN_START_MARKER, "hint"),
            scope: "world",
            config: true,
            type: String,
            default: "pcs",
            choices: {
                pcs: settingLabel(SETTING_NAMES.SHOW_TURN_START_MARKER, "pcs"),
                all: settingLabel(SETTING_NAMES.SHOW_TURN_START_MARKER, "all"),
                disabled: settingLabel(SETTING_NAMES.SHOW_TURN_START_MARKER, "disabled"),
            },
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ACK_MODE, {
            name: settingLabel(SETTING_NAMES.ACK_MODE, "name"),
            hint: settingLabel(SETTING_NAMES.ACK_MODE, "hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
        });

        game.settings.registerMenu(MODULE_NAME, "collapseSettings", {
            name: "Collapse Settings",
            label: "Collapse Settings",
            hint: "Configure which items keep their description expanded by default on chat cards.",
            icon: "fas fa-compress",
            type: CollapseSettingsApp,
            restricted: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.COLLAPSE_DESCRIPTION_EXCEPTIONS, {
            scope: "world",
            config: false,
            type: Array,
            default: [],
        });

    }

    /**
     * Retrieve a specific setting value for the provided key.
     * @param {SETTING_NAMES|string} settingKey The identifier of the setting to retrieve.
     * @returns {string|boolean} The value of the setting as set for the world/client.
     */
    static getSettingValue(settingKey) {
        return game.settings.get(MODULE_NAME, settingKey);
    }
}
