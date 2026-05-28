import { MODULE_NAME } from "../../shared/const.js";
import { VisualAuraSetupApp } from "../apps/VisualAuraSetupApp.js";
import { VisualAuraActorConfigApp } from "../apps/VisualAuraActorConfigApp.js";

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

export function registerSettings() {
    game.settings.registerMenu(MODULE_NAME, "visualAurasSetup", {
        name: "Visual Aura Setup",
        label: "Open Visual Aura Setup",
        hint: "Configure visual aura presets.",
        icon: "fas fa-circle-dashed",
        type: VisualAuraSetupApp,
        restricted: true,
    });

    game.settings.registerMenu(MODULE_NAME, "visualAurasActorConfig", {
        name: "Actor Configuration",
        label: "Configure Actors",
        hint: "Assign visual aura presets to actors across all scenes.",
        icon: "fas fa-users",
        type: VisualAuraActorConfigApp,
        restricted: true,
    });

    game.settings.register(MODULE_NAME, VA_SETTING_NAMES.PRESETS, {
        scope: "world",
        config: false,
        type: Array,
        default: [],
    });

    game.settings.register(MODULE_NAME, VA_SETTING_NAMES.ACTOR_CONFIG, {
        scope: "world",
        config: false,
        type: Object,
        default: {},
    });
}
