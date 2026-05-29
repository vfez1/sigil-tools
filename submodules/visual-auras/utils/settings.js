import { MODULE_NAME } from "../../shared/const.js";

export const VA_SETTING_NAMES = {
    PRESETS: "visualAuraPresets",
    ACTOR_CONFIG: "visualAuraActorConfig",
};

export function getPresets() {
    try {
        return game.settings.get(MODULE_NAME, VA_SETTING_NAMES.PRESETS) ?? [];
    } catch(e) {
        return [];
    }
}

export function getActorConfig() {
    try {
        return game.settings.get(MODULE_NAME, VA_SETTING_NAMES.ACTOR_CONFIG) ?? {};
    } catch(e) {
        return {};
    }
}

