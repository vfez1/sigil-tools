import { MODULE_NAME, MODULE_SHORT } from "../../shared/const.js";
import { CoreUtility } from "./core.js";

/**
 * Enumerable of identifiers for setting names.
 * @enum {String}
 */
export const SETTING_NAMES = {
    PREVENT_MOVEMENT_HISTORY: "preventMovementHistory",
    SHOW_TURN_START_MARKER: "showTurnStartMarker",
    ACK_MODE: "acknowledgedMode",
    ENABLE_ROLL_MODEL: "enableRollModel",
    ENABLE_ACTIVE_AURAS: "enableActiveAuras",
    ENABLE_OVERRIDE_SETTINGS: "enableOverrideSettings",
    ENABLE_SUPPRESS_WARNINGS: "enableSuppressWarnings",
    ENABLE_GRID_AWARE_AURAS: "enableGridAwareAuras",
    ENABLE_EFFECT_MACRO: "enableEffectMacro",
    ENABLE_CHARACTER_FEATURES: "enableCharacterFeatures",
};

/**
 * Utility class for registry of module settings and retrieval of setting data.
 */
export class SettingsUtility {
    /**
     * Registers all necessary module settings.
     */
    static registerSettings() {
        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_ROLL_MODEL, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_ROLL_MODEL}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_ROLL_MODEL}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_ACTIVE_AURAS, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_ACTIVE_AURAS}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_ACTIVE_AURAS}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_OVERRIDE_SETTINGS, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_OVERRIDE_SETTINGS}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_OVERRIDE_SETTINGS}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_SUPPRESS_WARNINGS, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_SUPPRESS_WARNINGS}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_SUPPRESS_WARNINGS}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_GRID_AWARE_AURAS, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_GRID_AWARE_AURAS}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_GRID_AWARE_AURAS}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_EFFECT_MACRO, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_EFFECT_MACRO}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_EFFECT_MACRO}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ENABLE_CHARACTER_FEATURES, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_CHARACTER_FEATURES}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ENABLE_CHARACTER_FEATURES}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.keybindings.register(MODULE_NAME, "rollVersatile", {
            name: CoreUtility.localize(`${MODULE_SHORT}.keybindings.rollVersatile.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.keybindings.rollVersatile.hint`),
            editable: [{ key: "KeyV" }],
            precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.PREVENT_MOVEMENT_HISTORY, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.PREVENT_MOVEMENT_HISTORY}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.PREVENT_MOVEMENT_HISTORY}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.SHOW_TURN_START_MARKER, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.SHOW_TURN_START_MARKER}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.SHOW_TURN_START_MARKER}.hint`),
            scope: "world",
            config: true,
            type: String,
            default: "pcs",
            choices: {
                pcs: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.SHOW_TURN_START_MARKER}.pcs`),
                all: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.SHOW_TURN_START_MARKER}.all`),
                disabled: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.SHOW_TURN_START_MARKER}.disabled`),
            },
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ACK_MODE, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ACK_MODE}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ACK_MODE}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
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
