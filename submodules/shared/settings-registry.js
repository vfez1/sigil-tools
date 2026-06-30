import { MODULE_NAME, MODULE_SHORT } from "./const.js";
import { SETTING_NAMES } from "./settings.js";
import { CollapseSettingsApp } from "../roll-model/apps/CollapseSettingsApp.js";
import { VisualAuraSetupApp } from "../visual-auras/apps/VisualAuraSetupApp.js";
import { VisualAuraActorConfigApp } from "../visual-auras/apps/VisualAuraActorConfigApp.js";
import { VA_SETTING_NAMES } from "../visual-auras/utils/settings.js";
import { CharacterSetupApp } from "../character-features/apps/CharacterSetupApp.js";
import { CF_SETTING_NAMES, DEFAULT_CONFIG } from "../character-features/utils/settings.js";
import { ARCHIVE_SETTINGS } from "../chat-archive/utils/settings.js";

function localize(key) { return game.i18n.localize(key); }
function label(settingKey, suffix) { return localize(`${MODULE_SHORT}.settings.${settingKey}.${suffix}`); }
function registerToggle(key) {
    game.settings.register(MODULE_NAME, key, {
        name: label(key, "name"), hint: label(key, "hint"),
        scope: "world", config: true, type: Boolean, default: true, requiresReload: true,
    });
}

export function registerAllSettings() {
    // ── Roll Model ────────────────────────────────────────────────────────────

    game.settings.register(MODULE_NAME, SETTING_NAMES.PREVENT_MOVEMENT_HISTORY, {
        name: label(SETTING_NAMES.PREVENT_MOVEMENT_HISTORY, "name"),
        hint: label(SETTING_NAMES.PREVENT_MOVEMENT_HISTORY, "hint"),
        scope: "world", config: true, type: Boolean, default: true, requiresReload: true,
    });

    game.settings.register(MODULE_NAME, SETTING_NAMES.SHOW_TURN_START_MARKER, {
        name: label(SETTING_NAMES.SHOW_TURN_START_MARKER, "name"),
        hint: label(SETTING_NAMES.SHOW_TURN_START_MARKER, "hint"),
        scope: "world", config: true, type: String, default: "all",
        choices: {
            pcs: label(SETTING_NAMES.SHOW_TURN_START_MARKER, "pcs"),
            all: label(SETTING_NAMES.SHOW_TURN_START_MARKER, "all"),
            disabled: label(SETTING_NAMES.SHOW_TURN_START_MARKER, "disabled"),
        },
    });

    game.settings.register(MODULE_NAME, SETTING_NAMES.ACK_MODE, {
        name: label(SETTING_NAMES.ACK_MODE, "name"),
        hint: label(SETTING_NAMES.ACK_MODE, "hint"),
        scope: "world", config: true, type: Boolean, default: true,
    });

    game.settings.registerMenu(MODULE_NAME, "collapseSettings", {
        name: "Collapse Settings",
        label: "Collapse Settings",
        hint: "Configure which items keep their description expanded by default on chat cards.",
        icon: "fas fa-compress",
        type: CollapseSettingsApp,
        restricted: true,
    });

    game.settings.register(MODULE_NAME, SETTING_NAMES.COLLAPSE_DESCRIPTION_EXCEPTIONS, {
        scope: "world", config: false, type: Array, default: [],
    });

    // ── Visual Auras ──────────────────────────────────────────────────────────

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
        scope: "world", config: false, type: Array, default: [],
    });

    game.settings.register(MODULE_NAME, VA_SETTING_NAMES.ACTOR_CONFIG, {
        scope: "world", config: false, type: Object, default: {},
    });

    // ── Character Features ────────────────────────────────────────────────────

    game.settings.registerMenu(MODULE_NAME, "characterFeaturesSetup", {
        name: "Character Setup",
        label: "Open Character Setup",
        hint: "Configure per-character automation (e.g. wild shape effect toggling).",
        icon: "fas fa-user-gear",
        type: CharacterSetupApp,
        restricted: true,
    });

    game.settings.register(MODULE_NAME, CF_SETTING_NAMES.CHARACTER_CONFIG, {
        scope: "world", config: false, type: Object, default: DEFAULT_CONFIG,
    });

    // ── Chat Archive ──────────────────────────────────────────────────────────

    game.settings.register(MODULE_NAME, ARCHIVE_SETTINGS.URL, {
        name: "Chat Archive URL",
        hint: "Endpoint to POST archived messages to.",
        scope: "world", config: true, type: String,
        default: "https://cityofdoors.net/chatarchive/api/archive",
    });

    game.settings.register(MODULE_NAME, ARCHIVE_SETTINGS.KEEP_COUNT, {
        name: "Chat Archive: Keep Recent",
        hint: "How many recent messages to keep when archiving. Everything older is archived and deleted from chat.",
        scope: "world", config: true, type: Number, default: 25,
    });

    // ── Submodule toggles (alphabetical) ─────────────────────────────────────

    registerToggle(SETTING_NAMES.ENABLE_ACTIVE_AURAS);
    registerToggle(SETTING_NAMES.ENABLE_CHARACTER_FEATURES);
    registerToggle(SETTING_NAMES.ENABLE_CHAT_ARCHIVE);
    registerToggle(SETTING_NAMES.ENABLE_EFFECT_MACRO);
    registerToggle(SETTING_NAMES.ENABLE_OVERRIDE_SETTINGS);
    registerToggle(SETTING_NAMES.ENABLE_ROLL_MODEL);
    registerToggle(SETTING_NAMES.ENABLE_SUPPRESS_WARNINGS);
    registerToggle(SETTING_NAMES.ENABLE_VISUAL_AURAS);

    // ── Keybindings ───────────────────────────────────────────────────────────

    game.keybindings.register(MODULE_NAME, "rollVersatile", {
        name: localize(`${MODULE_SHORT}.keybindings.rollVersatile.name`),
        hint: localize(`${MODULE_SHORT}.keybindings.rollVersatile.hint`),
        editable: [{ key: "KeyV" }],
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    });
}
