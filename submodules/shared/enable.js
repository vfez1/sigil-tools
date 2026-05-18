import { MODULE_NAME } from "./const.js";

/**
 * Returns whether a given submodule is enabled.
 * Safe to call at any point — falls back to true if settings are not yet registered.
 * @param {string} settingKey The setting key, e.g. "enableActiveAuras"
 * @returns {boolean}
 */
export function isEnabled(settingKey) {
    try {
        return game.settings.get(MODULE_NAME, settingKey) !== false;
    } catch {
        return true;
    }
}
