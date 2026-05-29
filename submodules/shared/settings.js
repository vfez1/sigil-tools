import { MODULE_NAME } from "./const.js";

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
    ENABLE_CHAT_ARCHIVE: "enableChatArchive",
};

export class SettingsUtility {
    static getSettingValue(settingKey) {
        return game.settings.get(MODULE_NAME, settingKey);
    }
}
