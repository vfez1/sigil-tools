import { MODULE_NAME } from "../../shared/const.js";

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
        const saved = game.settings.get(MODULE_NAME, CF_SETTING_NAMES.CHARACTER_CONFIG) ?? {};
        const result = foundry.utils.deepClone(saved);
        for (const [key, def] of Object.entries(DEFAULT_CONFIG)) {
            if (!(key in result)) result[key] = foundry.utils.deepClone(def);
        }
        return result;
    } catch {
        return foundry.utils.deepClone(DEFAULT_CONFIG);
    }
}

