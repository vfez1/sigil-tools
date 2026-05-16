import { MODULE_NAME } from "../config/const.js";

/**
 * Utility class with core functions for general use.
 */
export class CoreUtility {
    /**
     * Gets the module version for this module.
     * @returns The module version string.
     */
    static getVersion() {
        return game.modules.get(MODULE_NAME).version;
    }

    /**
     * Shorthand for both game.i18n.format() and game.i18n.localize() depending on whether data is supplied or not.
     * @param {String} key The key string to localize for.
     * @param {object?} data Optional data that if given will do a i18n.format() instead.
     * @returns {String} A localized string (with formatting if needed).
     */
    static localize(key, data = null) {
        if (data) {
            return game.i18n.format(key, data);
        }

        return game.i18n.localize(key);
    }

    /**
     * Based on the provided event, determine if the keys are pressed to fulfill the specified keybinding.
     * @param {Event} event    Triggering event.
     * @param {string} action  Keybinding action within the `dnd5e` namespace.
     * @returns {boolean}      Is the keybinding triggered?
     */
    static areKeysPressed(event, action) {
        return CoreUtility._checkKeybinding(event, "dnd5e", action);
    }

    /**
     * Based on the provided event, determine if the keys are pressed to fulfill the specified module keybinding.
     * @param {Event} event    Triggering event.
     * @param {string} action  Keybinding action within the module namespace.
     * @returns {boolean}      Is the keybinding triggered?
     */
    static areModuleKeysPressed(event, action) {
        return CoreUtility._checkKeybinding(event, MODULE_NAME, action);
    }

    /**
     * @param {Event} event       Triggering event.
     * @param {string} namespace  Keybinding namespace.
     * @param {string} action     Keybinding action.
     * @returns {boolean}
     * @private
     */
    static _checkKeybinding(event, namespace, action) {
        if (!event) return false;
        const activeModifiers = {};
        const addModifiers = (key, pressed) => {
            activeModifiers[key] = pressed;
            foundry.helpers.interaction.KeyboardManager.MODIFIER_CODES[key].forEach(n => activeModifiers[n] = pressed);
        };
        addModifiers(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL, event.ctrlKey || event.metaKey);
        addModifiers(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT, event.shiftKey);
        addModifiers(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.ALT, event.altKey);
        return game.keybindings.get(namespace, action).some(b => {
            if (game.keyboard.downKeys.has(b.key) && b.modifiers.every(m => activeModifiers[m])) return true;
            if (b.modifiers.length) return false;
            return activeModifiers[b.key];
        });
    }

    /**
     * Checks if a given module name exists and is active in Foundry.
     * @param {String} name The name of the module to check if active. 
     * @returns 
     */
    static hasModule(name) {
        return game.modules.get(name)?.active ?? false;
    }

    /**
     * Checks if a given object is iterable
     * @param {Object} obj The object to check
     * @returns {Boolean} true if the object is iterable, false otherwise
     */
    static isIterable(obj) {
        // checks for null and undefined
        if (obj == null) {
            return false;
        }

        return typeof obj[Symbol.iterator] === 'function';
    }

    /**
     * Gets data about whispers and roll mode for use in rendering messages.
     * @param {*} rollMode 
     * @returns {Object} A data package with the current roll mode.
     */
    static getWhisperData(rollMode = null) {
		let whisper = undefined;
		let blind = null;

		rollMode = rollMode || game.settings.get("core", "rollMode");

        if (["gmroll", "blindroll"].includes(rollMode)) {
            whisper = ChatMessage.getWhisperRecipients("GM");
        }

        if (rollMode === "blindroll") {
            blind = true;
        } 
        else if (rollMode === "selfroll") {
            whisper = [game.user.id];
        } 

		return { rollMode, whisper, blind }
	}

    /**
     * Gets the default configured dice sound from Foundry VTT config.
     * @returns {Object} A data package with the sound data to play when rolling.
     */
    static getRollSound() {
        let sound = undefined;

        if (!CoreUtility._lockRollSound && _areRollSoundsEnabled()) {
            CoreUtility._lockRollSound = true;
            setTimeout(() => CoreUtility._lockRollSound = false, 300);
            
            sound = CONFIG.sounds.dice;
        }

        return { sound }
    }

    /**
     * Plays the default roll sound from the audio helper.
     */
    static playRollSound() {
        const { sound } = CoreUtility.getRollSound();
        if (sound) foundry.audio.AudioHelper.play({ src: sound }, true);
    }

    /**
     * Asynchronous polling of a specific condition that ends when the condition is met.
     * @param {Function} condition The condition function to poll.
     * @returns {Promise} A promise that waits until the condition is met.
     */
    static async waitUntil(condition) {
        const poll = resolve => {
            if (condition()) resolve();
            else setTimeout(_ => poll(resolve), 10);
        }

        return new Promise(poll);
    }

    /**
     * Asynchronous polling of a specific condition that ends when the condition is no longer met.
     * @param {Function} condition The condition function to poll.
     * @returns {Promise} A promise that waits while the condition is met.
     */
    static async waitWhile(condition) {
        const poll = resolve => {
            if (condition()) setTimeout(_ => poll(resolve), 10);
            else resolve();
        }

        return new Promise(poll);
    }
}

function _areRollSoundsEnabled() {
    if (game.settings.settings.has("core.rollSounds")) {
        return game.settings.get("core", "rollSounds");
    }

    return true;
}
