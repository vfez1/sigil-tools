import { MODULE_NAME } from "./const.js";

export const SETTING_NAMES = {
    ENABLE_DEBUG_LOGS: "enableDebugLogs",
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
    ENABLE_CHAT_ARCHIVE: "enableChatArchive",
    ENABLE_EFFECT_AUTOCOMPLETE: "enableEffectAutocomplete",
    ENABLE_GRID_REGIONS: "enableGridRegions",
};

export class SettingsUtility {
    static getSettingValue(settingKey) {
        return game.settings.get(MODULE_NAME, settingKey);
    }

    /**
     * Whether verbose debug logging is enabled for this client. Safe to call before the setting
     * is registered (returns false), so log calls during early init never throw.
     * @returns {boolean}
     */
    static isDebugLogging() {
        try {
            return game.settings.get(MODULE_NAME, SETTING_NAMES.ENABLE_DEBUG_LOGS) === true;
        } catch {
            return false;
        }
    }
}
