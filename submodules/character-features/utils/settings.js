import { MODULE_NAME } from "../../shared/const.js";
import { CharacterSetupApp } from "../apps/CharacterSetupApp.js";

export const CF_SETTING_NAMES = {
    CHARACTER_CONFIG: "characterFeaturesConfig",
};

export const DEFAULT_CONFIG = {
    wabu: {
        enabled: true,
        actorName: "Wabu",
        wildshape: [
            { name: "Dueling", disabledWhileShaped: true },
            { name: "Natural Armor (Toggle OFF when Wild Shaped)", disabledWhileShaped: true },
            { name: "Improved Circle Forms (Toggle ON when Wild Shaped)", disabledWhileShaped: false },
            { name: "Lunar Transformation (Toggle ON when Attuned & Wild Shaped)", disabledWhileShaped: false, attuned: "Cloak of the Lunar Guardian" },
        ],
    },
};

export function getConfig() {
    try {
        return foundry.utils.mergeObject(
            foundry.utils.deepClone(DEFAULT_CONFIG),
            game.settings.get(MODULE_NAME, CF_SETTING_NAMES.CHARACTER_CONFIG) ?? {},
            { insertKeys: true, overwrite: true }
        );
    } catch {
        return foundry.utils.deepClone(DEFAULT_CONFIG);
    }
}

export function registerSettings() {
    game.settings.registerMenu(MODULE_NAME, "characterFeaturesSetup", {
        name: "Character Setup",
        label: "Open Character Setup",
        hint: "Configure per-character automation (e.g. wild shape effect toggling).",
        icon: "fas fa-user-gear",
        type: CharacterSetupApp,
        restricted: true,
    });

    game.settings.register(MODULE_NAME, CF_SETTING_NAMES.CHARACTER_CONFIG, {
        scope: "world",
        config: false,
        type: Object,
        default: DEFAULT_CONFIG,
    });
}
