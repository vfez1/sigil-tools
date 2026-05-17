import { MODULE_NAME, MODULE_SHORT } from "../../shared/const.js";
import { CoreUtility } from "./core.js";

/**
 * Enumerable of identifiers for setting names.
 * @enum {String}
 */
export const SETTING_NAMES = {
    PREVENT_MOVEMENT_HISTORY: "preventMovementHistory",
    WABU_WILDSHAPE_EFFECT_TOGGLE: "enableWabuWildshapeEffectToggle",
    ACK_MODE: "acknowledgedMode",
};

/**
 * Utility class for registry of module settings and retrieval of setting data.
 */
export class SettingsUtility {
    /**
     * Registers all necessary module settings.
     */
    static registerSettings() {
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

        game.settings.register(MODULE_NAME, SETTING_NAMES.ACK_MODE, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ACK_MODE}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ACK_MODE}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
        });

        // WILD SHAPE SETTINGS
        game.settings.register(MODULE_NAME, SETTING_NAMES.WABU_WILDSHAPE_EFFECT_TOGGLE, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.WABU_WILDSHAPE_EFFECT_TOGGLE}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.WABU_WILDSHAPE_EFFECT_TOGGLE}.hint`),
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
