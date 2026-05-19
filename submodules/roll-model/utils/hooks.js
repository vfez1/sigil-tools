import { MODULE_NAME, MODULE_SHORT, MODULE_TITLE } from "../../shared/const.js";
import { isEnabled } from "../../shared/enable.js";
import { AcknowledgedModeUtility } from "./ack.js";
import { ActivityUtility } from "./activity.js";
import { ChatUtility } from "./chat.js";
import { CoreUtility } from "./core.js";
import { AlwaysHPWidget, HPManager, applyHPDismissPatch } from "../../always-hp/always-hp.js";
import { ROLL_TYPE, RollUtility } from "./roll.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

export const HOOKS_CORE = {
    INIT: "init",
    READY: "ready",
    CREATE_ACTOR: "createActor",
};

export const HOOKS_DND5E = {
    PRE_ROLL_ABILITY_CHECK: "dnd5e.preRollAbilityCheckV2",
    PRE_ROLL_SAVING_THROW: "dnd5e.preRollSavingThrowV2",
    PRE_ROLL_SKILL: "dnd5e.preRollSkillV2",
    PRE_ROLL_TOOL_CHECK: "dnd5e.preRollToolV2",
    PRE_ROLL_ATTACK: "dnd5e.preRollAttackV2",
    POST_BUILD_ATTACK_ROLL_CONFIG: "dnd5e.postBuildAttackRollConfig",
    PRE_ROLL_DAMAGE: "dnd5e.preRollDamageV2",
    POST_BUILD_DAMAGE_ROLL_CONFIG: "dnd5e.postBuildDamageRollConfig",
    POST_DAMAGE_ROLL_CONFIGURATION: "dnd5e.postDamageRollConfiguration",
    PRE_USE_ACTIVITY: "dnd5e.preUseActivity",
    POST_USE_ACTIVITY: "dnd5e.postUseActivity",
    ACTIVITY_CONSUMPTION: "dnd5e.activityConsumption",
    REST_COMPLETED: "dnd5e.restCompleted",
    DISPLAY_CARD: "dnd5e.displayCard",
    RENDER_CHAT_MESSAGE: "dnd5e.renderChatMessage",
    RENDER_ITEM_SHEET: "renderItemSheet5e",
    RENDER_ACTOR_SHEET: "renderActorSheet5e",
    TRANSFORM_ACTOR_V2: "dnd5e.transformActorV2",
    REVERT_ORIGINAL_FORM: "dnd5e.revertOriginalForm",
};

/**
 * Utility class to handle registering listeners for hooks needed throughout the module.
 */
export class HooksUtility {
    /**
     * Register all necessary hooks for the module as a whole.
     */
    static registerModuleHooks() {
        Hooks.once(HOOKS_CORE.INIT, () => {
            _logHookDebug(`Initialising ${MODULE_TITLE}`);

            SettingsUtility.registerSettings();

            if (!isEnabled(SETTING_NAMES.ENABLE_ROLL_MODEL)) return;

            _applyTokenMovementHistoryPrevention();
            _applyTurnStartMarker();
            _applyRollModePatch();
            applyHPDismissPatch();

            game.keybindings.register(MODULE_NAME, "hp-toggle", {
                name: "Toggle HP Widget",
                hint: "Show or hide the always-visible HP widget.",
                editable: [],
                onDown: () => {
                    HPManager.toggleApp();
                },
            });

            game.keybindings.register(MODULE_NAME, "hp-focus", {
                name: "Focus HP Input",
                hint: "Open and focus the HP widget input field.",
                editable: [],
                onDown: () => {
                    if (!HPManager.app) {
                        HPManager.app = new AlwaysHPWidget();
                        HPManager.app.render(true);
                    } else {
                        HPManager.app.bringToTop();
                    }
                    $("#alwayshp-hp", HPManager.app.element).focus();
                },
            });

            HooksUtility.registerRollHooks();
            HooksUtility.registerChatHooks();
            HooksUtility.registerSceneControlHooks();
        });

        Hooks.on(HOOKS_CORE.READY, () => {
            if (!isEnabled(SETTING_NAMES.ENABLE_ROLL_MODEL)) return;

            CONFIG[MODULE_SHORT].combinedDamageTypes = foundry.utils.mergeObject(
                Object.fromEntries(Object.entries(CONFIG.DND5E.damageTypes).map(([k, v]) => [k, v.label])),
                Object.fromEntries(Object.entries(CONFIG.DND5E.healingTypes).map(([k, v]) => [k, v.label])),
                { recursive: false }
            );

            HooksUtility.registerHPHooks();
            HooksUtility.registerWildshapeHooks();

            _logHookDebug(`Loaded ${MODULE_TITLE}`);
        });
    }

    /**
     * Register roll specific hooks for module functionality.
     */
    static registerRollHooks() {
        _logHookDebug("Registering roll hooks");

        Hooks.on(HOOKS_DND5E.PRE_ROLL_ABILITY_CHECK, (config, dialog, message) => {
            RollUtility.processRoll(config, dialog, message);
            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_SAVING_THROW, (config, dialog, message) => {
            RollUtility.processRoll(config, dialog, message);
            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_SKILL, (config, dialog, message) => {
            RollUtility.processRoll(config, dialog, message);
            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_TOOL_CHECK, (config, dialog, message) => {
            RollUtility.processRoll(config, dialog, message);
            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_USE_ACTIVITY, (activity, usageConfig, dialogConfig, messageConfig) => {
            RollUtility.processActivity(usageConfig, dialogConfig, messageConfig);
            ActivityUtility.setRenderFlags(activity, messageConfig);

            const hasGWM = activity.actor?.items.some((i) => i.type === "feat" && i.name.toLowerCase() === "great weapon master");
            const isHeavy = activity.item?.system?.properties?.has("hvy") ?? false;
            if (hasGWM && isHeavy) {
                messageConfig.data.flags[MODULE_SHORT].gwmEligible = true;
                messageConfig.data.flags[MODULE_SHORT].gwmActive = true;
            }

            const hasAttackActivity = activity.hasOwnProperty(ROLL_TYPE.ATTACK);
            const celestialRevelationInfo = hasAttackActivity ? RollUtility.getCelestialShroudEffect(activity.actor) : null;
            if (celestialRevelationInfo) {
                messageConfig.data.flags[MODULE_SHORT].celestialRevelationEligible = true;
                messageConfig.data.flags[MODULE_SHORT].celestialRevelationDamageType = celestialRevelationInfo.damageType;
                messageConfig.data.flags[MODULE_SHORT].celestialRevelationActive = false;
            }

            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_ATTACK, (config, dialog, message) => {
            if (!message.data?.flags || !message.data.flags[MODULE_SHORT]?.quickRoll) return true;

            for (const roll of config.rolls) {
                roll.options.advantage ??= config.advantage;
                roll.options.disadvantage ??= config.disadvantage;
            }

            dialog.configure = false;

            return true;
        });

        // Fires per-roll after _buildAttackConfig adds parts + data to the individual roll config.
        // rollConfig.options is the same reference that becomes roll.options on the D20Roll,
        // so writing bonusParts/bonusData here makes them available at render time.
        Hooks.on(HOOKS_DND5E.POST_BUILD_ATTACK_ROLL_CONFIG, (outerConfig, rollConfig, index) => {
            RollUtility.captureAttackFormulaParts(outerConfig, rollConfig, index);
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_DAMAGE, (config, dialog, message) => {
            if (!message.data?.flags || !message.data.flags[MODULE_SHORT]?.quickRoll) return true;

            for (const roll of config.rolls) {
                roll.options ??= {};
                roll.options.isCritical ??= config.isCritical;
                RollUtility.captureFormulaParts(roll);
            }

            dialog.configure = false;

            return true;
        });

        Hooks.on(HOOKS_DND5E.POST_BUILD_DAMAGE_ROLL_CONFIG, (outerConfig, rollConfig, index) => {
            RollUtility.applyGWMDamageBonus(outerConfig, rollConfig, index);
            RollUtility.applyElementalFuryPotentSpellcastingDamageBonus(outerConfig, rollConfig, index);
            RollUtility.injectLunarRadianceType(outerConfig, rollConfig);
            RollUtility.captureDamageFormulaParts(outerConfig, rollConfig, index);
        });

        Hooks.on(HOOKS_DND5E.POST_DAMAGE_ROLL_CONFIGURATION, (rolls, config, dialog, message) => {
            RollUtility.captureDamageRollSources(rolls, config);
        });

        Hooks.on(HOOKS_DND5E.REST_COMPLETED, async (actor, result, config) => {
            if (_shouldRefreshRavenQueenInspiration(actor, config)) await actor.update({ "system.attributes.inspiration": true });

            if (_hasItem(actor, "Book of the Dead")) {
                const hp = actor.system.attributes.hp;
                const effectiveMax = hp.max + (hp.tempmax ?? 0);
                await actor.update({
                    "system.attributes.hp.value": Math.min(hp.value + 300, effectiveMax),
                });
            }
        });

        Hooks.on(HOOKS_DND5E.ACTIVITY_CONSUMPTION, (activity, usageConfig, messageConfig, updates) => {
            if (activity.hasOwnProperty(ROLL_TYPE.ATTACK) && updates.item.length > 0 && messageConfig.data) {
                const ammo = updates.item.find((i) => i["system.quantity"]);
                if (!ammo) return;
                messageConfig.data.flags[MODULE_SHORT].ammunition = ammo._id;
                ammo["system.quantity"]++;
            }
        });

        // Ensures that the post use hook from RSR registers last so that it doesn't block other modules
        setTimeout(() => {
            Hooks.on(HOOKS_DND5E.POST_USE_ACTIVITY, (activity, usageConfig, results) => {
                return false;
            });
        }, 15000);
    }

    /**
     * Register chat specific hooks for module functionality.
     */
    static registerChatHooks() {
        _logHookDebug("Registering chat hooks");

        Hooks.on(HOOKS_DND5E.RENDER_CHAT_MESSAGE, (message, html) => {
            ChatUtility.processChatMessage(message, html);
            AcknowledgedModeUtility.onNewMessage(message, html);
            AcknowledgedModeUtility.applyAcknowledgedStyle(message, html);
        });

        AcknowledgedModeUtility.registerApplyListener();
        AcknowledgedModeUtility.registerSocketListener();
    }

    static registerSceneControlHooks() {
        _logHookDebug("Registering scene control hooks");

        Hooks.on("getSceneControlButtons", (controls) => {
            const tokenControls = controls.tokens ?? controls.token;
            if (!tokenControls?.tools) return;

            if (AlwaysHPWidget.canLoad()) {
                tokenControls.tools.toggledialog = {
                    name: "toggledialog",
                    title: "Toggle HP Widget",
                    icon: "fas fa-briefcase-medical",
                    toggle: true,
                    active: game.user.getFlag(MODULE_NAME, "alwayshpShowDialog") !== false,
                    onChange: async (toggled) => {
                        await game.user.setFlag(MODULE_NAME, "alwayshpShowDialog", toggled);
                        HPManager.toggleApp(toggled);
                    },
                };
            }
        });
    }

    static registerHPHooks() {
        _logHookDebug("Registering HP widget hooks");

        const showDialog = game.user.getFlag(MODULE_NAME, "alwayshpShowDialog") !== false;
        if (showDialog && AlwaysHPWidget.canLoad()) HPManager.toggleApp(true);

        Hooks.on("controlToken", () => {
            HPManager.refresh();
        });

        Hooks.on("updateActor", (actor, data) => {
            if (
                canvas.tokens.controlled.length == 1 &&
                canvas.tokens.controlled[0]?.actor?.id == actor.id &&
                (foundry.utils.getProperty(data, "system.attributes.death") != undefined || foundry.utils.getProperty(data, "system.attributes.hp.value"))
            ) {
                HPManager.refresh();
            }
        });
    }

    static registerWildshapeHooks() {
        _logHookDebug("Registering wild shape effect hooks");

        // Beast form actor is created after transformActorV2 fires, so we hook createActor instead.
        Hooks.on(HOOKS_CORE.CREATE_ACTOR, (actor, options, userId) => {
            if (!SettingsUtility.getSettingValue(SETTING_NAMES.WABU_WILDSHAPE_EFFECT_TOGGLE)) return;
            if (!actor.getFlag("dnd5e", "isPolymorphed")) return;
            const originalId = actor.getFlag("dnd5e", "originalActor");
            const original = originalId ? game.actors.get(originalId) : null;
            _applyWildshapeEffectToggle(actor, true, original);
        });

        Hooks.on(HOOKS_DND5E.REVERT_ORIGINAL_FORM, (actor, options) => {
            if (!SettingsUtility.getSettingValue(SETTING_NAMES.WABU_WILDSHAPE_EFFECT_TOGGLE)) return;
            const originalId = actor.getFlag("dnd5e", "originalActor");
            const original = originalId ? game.actors.get(originalId) : null;
            if (!original) return;
            _applyWildshapeEffectToggle(original, false, original);
        });
    }
}

function _logHookDebug(_message) {
    return;
}

function _shouldRefreshRavenQueenInspiration(actor, config) {
    if (config?.type !== "long") return false;
    if (actor?.type !== "character") return false;
    if (actor.system?.attributes?.inspiration) return false;
    if (!_canRefreshActorInspiration(actor)) return false;

    return actor.items?.some((i) => i.type === "feat" && i.name.toLowerCase() === "blessing of the raven queen") ?? false;
}

function _canRefreshActorInspiration(actor) {
    return game.user.isGM || actor.id === game.user.character?.id || actor.isOwner;
}

function _hasItem(actor, itemName) {
    return actor?.items?.some((i) => i.name.toLowerCase() === itemName.toLowerCase()) ?? false;
}

function _applyRollModePatch() {
    // Foundry v14 deprecated ChatMessage#applyRollMode in favor of #applyMode.
    // dnd5e's BasicRoll.toMessage still calls the old method, and roll-model
    // triggers that path via activity.rollDamage({ create: false }). Redirect
    // silently so the deprecation warning doesn't fire.
    if ((game.release?.generation ?? 0) < 14) return;
    libWrapper.register(
        MODULE_NAME,
        "ChatMessage.prototype.applyRollMode",
        function (rollMode) {
            return this.applyMode(rollMode);
        },
        "OVERRIDE"
    );
}

function _applyTokenMovementHistoryPrevention() {
    if (!_getPreventMovementHistorySetting()) return;
    if (CONFIG.Token.documentClass?._rollModelPreventsMovementHistory) return;

    class RollModelTokenDocument extends CONFIG.Token.documentClass {
        static _rollModelPreventsMovementHistory = true;

        _shouldRecordMovementHistory() {
            return false;
        }
    }

    CONFIG.Token.documentClass = RollModelTokenDocument;
}

function _applyTurnStartMarker() {
    const mode = SettingsUtility.getSettingValue(SETTING_NAMES.SHOW_TURN_START_MARKER);
    if (mode === "disabled") return;

    let _marker = null;

    function _draw(combatant) {
        _clear();
        const token = combatant?.token;
        if (!token || !canvas.primary) return;
        if (mode === "pcs" && combatant.actor?.type !== "character") return;

        const size = canvas.grid.size;
        const w = Math.max(1, token.width) * size;
        const h = Math.max(1, token.height) * size;

        const g = new PIXI.Graphics();
        g.beginFill(0x44aaff, 0.25);
        g.lineStyle(3, 0x44aaff, 1.0);
        g.drawRect(0, 0, w, h);
        g.endFill();
        g.x = token.x;
        g.y = token.y;
        g.elevation = token.elevation ?? 0;
        g.sortLayer = 300;

        canvas.primary.addChild(g);
        _marker = g;
    }

    function _clear() {
        if (_marker) {
            canvas.primary?.removeChild(_marker);
            _marker.destroy();
            _marker = null;
        }
    }

    Hooks.on("updateCombat", (combat, changes) => {
        if (!("turn" in changes) && !("round" in changes)) return;
        _draw(combat.combatant);
    });

    Hooks.on("deleteCombat", () => _clear());
    Hooks.on("canvasTearDown", () => _clear());
}

function _getPreventMovementHistorySetting() {
    try {
        return SettingsUtility.getSettingValue(SETTING_NAMES.PREVENT_MOVEMENT_HISTORY);
    } catch {
        return false;
    }
}

// Effect names and whether they should be disabled (true) or enabled (false) while wild shaped.
const WILDSHAPE_EFFECT_TARGETS = {
    Dueling: true,
    "Natural Armor (Toggle OFF when Wild Shaped)": true,
    "Improved Circle Forms (Toggle ON when Wild Shaped)": false,
    "Lunar Transformation (Toggle ON when Attuned & Wild Shaped)": false,
};

async function _applyWildshapeEffectToggle(actor, isWildShaping, attunementActor) {
    const targets = Object.fromEntries(
        Object.entries(WILDSHAPE_EFFECT_TARGETS).map(([name, disabledWhileShaped]) => [name, isWildShaping ? disabledWhileShaped : !disabledWhileShaped])
    );

    const candidates = [...actor.effects, ...[...actor.items].flatMap((i) => [...i.effects])];

    const updatesByParent = new Map();
    const log = [];

    for (const [name, disabled] of Object.entries(targets)) {
        const matches = candidates.filter((e) => e.name === name);
        if (!matches.length) {
            log.push(`Not found: <em>${name}</em>`);
            continue;
        }
        for (const eff of matches) {
            const parentItem = eff.parent?.documentName === "Item" ? eff.parent : null;
            if (parentItem?.name.startsWith("Cloak of the Lunar Guardian")) {
                const cloakOnOriginal = attunementActor?.items.find((i) => i.name.startsWith("Cloak of the Lunar Guardian"));
                if (!cloakOnOriginal?.system?.attuned) {
                    log.push(`${eff.name} — skipped (not attuned)`);
                    continue;
                }
            }
            if (eff.disabled === disabled) {
                log.push(`${eff.name} — already ${disabled ? "off" : "on"}`);
                continue;
            }
            if (!updatesByParent.has(eff.parent)) updatesByParent.set(eff.parent, []);
            updatesByParent.get(eff.parent).push({ _id: eff.id, disabled });
            log.push(`${eff.name} → <strong>${disabled ? "off" : "on"}</strong>`);
        }
    }

    for (const [parent, updates] of updatesByParent) {
        await parent.updateEmbeddedDocuments("ActiveEffect", updates);
    }

    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<strong>${actor.name} — ${isWildShaping ? "Wild Shape" : "Restore form"}</strong><br>${log.join("<br>")}`,
    });
}
