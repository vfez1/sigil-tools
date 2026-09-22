import { MODULE_NAME, MODULE_SHORT } from "../../shared/const.js";
import { isEnabled } from "../../shared/enable.js";
import { SETTING_NAMES, SettingsUtility } from "../../shared/settings.js";
import { registerSettingsPanelHooks } from "../../shared/settings-panel.js";
import { registerAllSettings } from "../../shared/settings-registry.js";
import { AcknowledgedModeUtility } from "./ack.js";
import { ActivityUtility } from "./activity.js";
import { ChatUtility } from "./chat.js";
import { AlwaysHPWidget, HPManager, applyHPDismissPatch } from "../../always-hp/always-hp.js";
import { ROLL_TYPE, RollUtility } from "./roll.js";
import { registerEffectAutocompleteHooks } from "../../effect-autocomplete/effect-autocomplete.js";
import { LogUtility } from "./log.js";

export const HOOKS_CORE = {
    INIT: "init",
    READY: "ready",
};

export const HOOKS_DND5E = {
    PRE_ROLL_ABILITY_CHECK: "dnd5e.preRollAbilityCheckV2",
    PRE_ROLL_SAVING_THROW: "dnd5e.preRollSavingThrowV2",
    POST_BUILD_SAVING_THROW_ROLL_CONFIG: "dnd5e.postBuildSavingThrowRollConfig",
    POST_BUILD_ABILITY_CHECK_ROLL_CONFIG: "dnd5e.postBuildAbilityCheckRollConfig",
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
};

/** Message ids whose property-tags row the user has expanded (survives dnd5e re-renders). */
const _expandedTagRows = new Set();

/**
 * Utility class to handle registering listeners for hooks needed throughout the module.
 */
export class HooksUtility {
    /**
     * Register all necessary hooks for the module as a whole.
     */
    static registerModuleHooks() {
        Hooks.once(HOOKS_CORE.INIT, () => {
            registerAllSettings();

            if (!isEnabled(SETTING_NAMES.ENABLE_ROLL_MODEL)) return;

            _applyTokenMovementHistoryPrevention();
            _applyTurnStartMarker();
            _applyRollModePatch();
            _applyInitiativeRerollPatch();
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
                    $("#ahp-hp", HPManager.app.element).focus();
                },
            });

            HooksUtility.registerRollHooks();
            HooksUtility.registerChatHooks();
            HooksUtility.registerSceneControlHooks();
            HooksUtility.registerActorSheetHooks();
        });

        registerSettingsPanelHooks();
        registerEffectAutocompleteHooks();

        Hooks.on(HOOKS_CORE.READY, () => {
            if (!isEnabled(SETTING_NAMES.ENABLE_ROLL_MODEL)) return;

            CONFIG[MODULE_SHORT].combinedDamageTypes = foundry.utils.mergeObject(
                Object.fromEntries(Object.entries(CONFIG.DND5E.damageTypes).map(([k, v]) => [k, v.label])),
                Object.fromEntries(Object.entries(CONFIG.DND5E.healingTypes).map(([k, v]) => [k, v.label])),
                { recursive: false }
            );

            HooksUtility.registerHPHooks();
        });
    }

    /**
     * Register roll specific hooks for module functionality.
     */
    static registerRollHooks() {
        LogUtility.log(`[RM DEBUG] registerRollHooks() called — registering all dnd5e roll hooks now.`);

        Hooks.on(HOOKS_DND5E.PRE_ROLL_ABILITY_CHECK, (config, dialog, message) => {
            LogUtility.log(`[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.PRE_ROLL_ABILITY_CHECK}`);
            try {
                RollUtility.processRoll(config, dialog, message);
            } catch (e) {
                LogUtility.logError(`[RM DEBUG] EXCEPTION in ${HOOKS_DND5E.PRE_ROLL_ABILITY_CHECK} handler: ${e?.message}`, { ui: false });
                console.error(e);
            }
            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_SAVING_THROW, (config, dialog, message) => {
            LogUtility.log(`[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.PRE_ROLL_SAVING_THROW}`);

            // One save per token per card: dnd5e's Save button creates a fresh save message (and
            // summary row) every press. If this token already has one on the originating card,
            // refuse the roll — rerolls go through the row's adv/dis buttons instead.
            try {
                const origin = message?.data?.system?.origin ? game.messages.get(message.data.system.origin) : null;
                const spk = message?.data?.speaker ?? {};
                const tokenUuid = spk.scene && spk.token ? `Scene.${spk.scene}.Token.${spk.token}` : null;
                if (origin && tokenUuid) {
                    const existing = origin.getAssociatedRolls?.("save")?.find((m) => m.getAssociatedToken?.()?.uuid === tokenUuid);
                    if (existing) {
                        const name = fromUuidSync(tokenUuid)?.name ?? "This token";
                        ui.notifications.warn(`${name} has already rolled this save. Use the row's advantage/disadvantage buttons to reroll.`);
                        LogUtility.log(`[RM DEBUG] ${HOOKS_DND5E.PRE_ROLL_SAVING_THROW}: blocked duplicate save for ${tokenUuid} on ${origin.id} (existing ${existing.id})`);
                        return false;
                    }
                }
            } catch (e) {
                LogUtility.logError(`[RM DEBUG] duplicate-save check failed: ${e?.message}`, { ui: false });
                console.error(e);
            }

            try {
                RollUtility.processRoll(config, dialog, message);
            } catch (e) {
                LogUtility.logError(`[RM DEBUG] EXCEPTION in ${HOOKS_DND5E.PRE_ROLL_SAVING_THROW} handler: ${e?.message}`, { ui: false });
                console.error(e);
            }
            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_SKILL, (config, dialog, message) => {
            LogUtility.log(`[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.PRE_ROLL_SKILL}`);
            try {
                RollUtility.processRoll(config, dialog, message);
            } catch (e) {
                LogUtility.logError(`[RM DEBUG] EXCEPTION in ${HOOKS_DND5E.PRE_ROLL_SKILL} handler: ${e?.message}`, { ui: false });
                console.error(e);
            }
            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_TOOL_CHECK, (config, dialog, message) => {
            LogUtility.log(`[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.PRE_ROLL_TOOL_CHECK}`);
            try {
                RollUtility.processRoll(config, dialog, message);
            } catch (e) {
                LogUtility.logError(`[RM DEBUG] EXCEPTION in ${HOOKS_DND5E.PRE_ROLL_TOOL_CHECK} handler: ${e?.message}`, { ui: false });
                console.error(e);
            }
            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_USE_ACTIVITY, (activity, usageConfig, dialogConfig, messageConfig) => {
            LogUtility.log(
                `[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.PRE_USE_ACTIVITY} activity="${activity?.name}" (${activity?.type}) item="${activity?.item?.name}"`
            );
            try {
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

                LogUtility.log(`[RM DEBUG] ${HOOKS_DND5E.PRE_USE_ACTIVITY} handler DONE. flags=${JSON.stringify(messageConfig.data.flags[MODULE_SHORT])}`);
            } catch (e) {
                LogUtility.logError(`[RM DEBUG] EXCEPTION in ${HOOKS_DND5E.PRE_USE_ACTIVITY} handler: ${e?.message}`, { ui: false });
                console.error(e);
            }

            return true;
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_ATTACK, (config, dialog, message) => {
            LogUtility.log(
                `[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.PRE_ROLL_ATTACK} message.data.flags[rm]=${JSON.stringify(message.data?.flags?.[MODULE_SHORT])}`
            );

            if (!message.data?.flags || !message.data.flags[MODULE_SHORT]?.quickRoll) {
                LogUtility.log(`[RM DEBUG] ${HOOKS_DND5E.PRE_ROLL_ATTACK}: not a quickRoll (or no rm flags at all) — skipping fast-forward.`);
                return true;
            }

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
            LogUtility.log(`[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.POST_BUILD_ATTACK_ROLL_CONFIG} index=${index} parts=${JSON.stringify(rollConfig?.parts)}`);
            RollUtility.captureAttackFormulaParts(outerConfig, rollConfig, index);
        });

        // Ability, skill and tool checks all carry the "abilityCheck" hook name, so one hook covers them.
        Hooks.on(HOOKS_DND5E.POST_BUILD_ABILITY_CHECK_ROLL_CONFIG, (outerConfig, rollConfig, index) => {
            LogUtility.log(
                `[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.POST_BUILD_ABILITY_CHECK_ROLL_CONFIG} index=${index} parts=${JSON.stringify(rollConfig?.parts)}`
            );
            RollUtility.captureCheckFormulaParts(outerConfig, rollConfig, index);
        });

        Hooks.on(HOOKS_DND5E.POST_BUILD_SAVING_THROW_ROLL_CONFIG, (outerConfig, rollConfig, index) => {
            LogUtility.log(
                `[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.POST_BUILD_SAVING_THROW_ROLL_CONFIG} index=${index} parts=${JSON.stringify(rollConfig?.parts)}`
            );
            RollUtility.captureSaveFormulaParts(outerConfig, rollConfig, index);
        });

        Hooks.on(HOOKS_DND5E.PRE_ROLL_DAMAGE, (config, dialog, message) => {
            LogUtility.log(
                `[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.PRE_ROLL_DAMAGE} message.data.flags=${_safeKeysLocal(message.data?.flags)} rm=${JSON.stringify(message.data?.flags?.[MODULE_SHORT])}`
            );

            // Activity-driven damage (normal weapon rolls) already has flags set by processActivity
            // via PRE_USE_ACTIVITY earlier in the same pipeline. A bare damage enricher with no
            // associated activity (e.g. a weapon mastery's [[/damage ...]] link) never goes through
            // that hook, so flags[MODULE_SHORT] would otherwise never exist — process it here instead,
            // same as the ability-check/save/skill/tool hooks above do for their own standalone rolls.
            if (!message.data?.flags?.[MODULE_SHORT]) {
                LogUtility.log(`[RM DEBUG] ${HOOKS_DND5E.PRE_ROLL_DAMAGE}: no rm flags yet — this is a standalone damage roll, calling processRoll().`);
                try {
                    RollUtility.processRoll(config, dialog, message);
                } catch (e) {
                    LogUtility.logError(`[RM DEBUG] EXCEPTION in ${HOOKS_DND5E.PRE_ROLL_DAMAGE} processRoll fallback: ${e?.message}`, { ui: false });
                    console.error(e);
                }
            }

            // Default multi-type parts (e.g. Shillelagh bludgeoning|force) to the type this user last
            // picked on a card for this item, so the choice is baked into the roll that gets stored.
            ChatUtility.applyDamageTypePrefs(config.subject?.item, config.rolls);

            if (!message.data?.flags || !message.data.flags[MODULE_SHORT]?.quickRoll) {
                LogUtility.log(`[RM DEBUG] ${HOOKS_DND5E.PRE_ROLL_DAMAGE}: not a quickRoll — skipping fast-forward.`);
                return true;
            }

            for (const roll of config.rolls) {
                roll.options ??= {};
                roll.options.isCritical ??= config.isCritical;
                RollUtility.captureFormulaParts(roll);
            }

            dialog.configure = false;

            return true;
        });

        Hooks.on(HOOKS_DND5E.POST_BUILD_DAMAGE_ROLL_CONFIG, (outerConfig, rollConfig, index) => {
            LogUtility.log(`[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.POST_BUILD_DAMAGE_ROLL_CONFIG} index=${index} parts=${JSON.stringify(rollConfig?.parts)}`);
            RollUtility.applyGWMDamageBonus(outerConfig, rollConfig, index);
            RollUtility.applyElementalFuryPotentSpellcastingDamageBonus(outerConfig, rollConfig, index);
            RollUtility.injectLunarRadianceType(outerConfig, rollConfig);
            RollUtility.stripNonSpellHealBonus(outerConfig, rollConfig);
            RollUtility.captureDamageFormulaParts(outerConfig, rollConfig, index);
        });

        Hooks.on(HOOKS_DND5E.POST_DAMAGE_ROLL_CONFIGURATION, (rolls, config, dialog, message) => {
            LogUtility.log(`[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.POST_DAMAGE_ROLL_CONFIGURATION} rollCount=${rolls?.length}`);
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

            await _rollPortentDice(actor, config);
        });

        Hooks.on(HOOKS_DND5E.ACTIVITY_CONSUMPTION, (activity, usageConfig, messageConfig, updates) => {
            LogUtility.log(
                `[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.ACTIVITY_CONSUMPTION} activity="${activity?.name}" type=${activity?.type} scaling=${usageConfig?.scaling}`
            );
            // For pool-based heal activities (e.g. Lay on Hands), dnd5e does not persist
            // the user-chosen healing amount to message.flags.dnd5e.scaling.  Capture it
            // here (after the dialog, usageConfig.scaling holds the chosen value) so that
            // getDamageFromMessage can pass it to rollDamage and produce the right total.
            if (activity.type === "heal" && usageConfig.scaling != null && messageConfig?.data?.flags?.[MODULE_SHORT]) {
                messageConfig.data.flags[MODULE_SHORT].healingScaling = usageConfig.scaling;
            }

            // Some spell activities (for example save-based spells like Fireball) carry the
            // selected upcast level in usageConfig.scaling, but dnd5e does not always persist
            // it onto the message. Preserve it so roll-model can reconstruct damage later.
            if (activity.item?.type === "spell" && usageConfig.scaling != null && messageConfig?.data?.flags) {
                messageConfig.data.flags.dnd5e ??= {};
                messageConfig.data.flags.dnd5e.scaling = usageConfig.scaling;
                if (messageConfig.data.flags[MODULE_SHORT]) {
                    messageConfig.data.flags[MODULE_SHORT].spellScaling = usageConfig.scaling;
                }
            }

            if (activity.hasOwnProperty(ROLL_TYPE.ATTACK) && updates.item.length > 0 && messageConfig.data) {
                const ammo = updates.item.find((i) => i["system.quantity"]);
                if (!ammo) return;
                messageConfig.data.flags[MODULE_SHORT].ammunition = ammo._id;
                ammo["system.quantity"]++;
            }
        });

        // dnd5e's post-use auto-roll is opted out per activity via usageConfig.subsequentActions in
        // RollUtility.processActivity (preUseActivity), so no postUseActivity blocker is needed.
    }

    /**
     * Register chat specific hooks for module functionality.
     */
    static registerChatHooks() {
        // Visibility diagnostics: confirms whether this client receives the author's
        // "processed" update at all, and whether Foundry re-renders the message for it.
        Hooks.on("updateChatMessage", (message, changes, options, userId) => {
            LogUtility.log(
                `[RM DEBUG] core updateChatMessage messageId=${message?.id} byUser=${userId} thisUser=${game.user?.name} changedKeys=${JSON.stringify(Object.keys(changes ?? {}))} rmProcessedNow=${message?.flags?.[MODULE_SHORT]?.processed}`
            );
        });

        Hooks.on(HOOKS_DND5E.RENDER_CHAT_MESSAGE, (message, html) => {
            LogUtility.log(
                `[RM DEBUG] HOOK FIRED: ${HOOKS_DND5E.RENDER_CHAT_MESSAGE} messageId=${message?.id} flags[rm]=${JSON.stringify(message?.flags?.[MODULE_SHORT])}`
            );
            ChatUtility.processChatMessage(message, html);
            AcknowledgedModeUtility.onNewMessage(message, html);
            AcknowledgedModeUtility.applyAcknowledgedStyle(message, html);
            _attachPortentClickHandlers(message, html);

            // Collapse the item description on usage cards by default.
            // Keep expanded if: the item has a chat description (or the activity has its own
            // description, which dnd5e shows in the same slot), or the item name is in the exceptions list.
            // dnd5e 6.0 markup (templates/chat/parts/card-face.hbs): the header carries
            // data-action="toggleDescription" and #toggleDescription toggles "collapsed" on both the
            // header (chevron) and the sibling "section.card-description.collapsible" (content).
            {
                const root = html instanceof HTMLElement ? html : html[0];
                const descHeader = root?.querySelector('.card-header[data-action="toggleDescription"]');
                const descBody = root?.querySelector(".card-description.collapsible");
                if (descHeader && descBody) {
                    const item = message.getAssociatedItem?.();
                    const activity = message.getAssociatedActivity?.();
                    const hasChatDescription =
                        !!item?.system?.description?.chat?.trim() || !!activity?.description?.value?.trim();
                    const exceptions = SettingsUtility.getSettingValue(SETTING_NAMES.COLLAPSE_DESCRIPTION_EXCEPTIONS) ?? [];
                    const inExceptions = !!item?.name && exceptions.some((e) => e.toLowerCase() === item.name.toLowerCase());
                    if (!hasChatDescription && !inExceptions) {
                        descHeader.classList.add("collapsed");
                        descBody.classList.add("collapsed");
                    }
                }
            }

            // Collapse the item property tags row (dnd5e's "rows.properties": section.icon-row with
            // an fa-tag icon + ul.pills) by default. All pills stay in the DOM — nothing is filtered —
            // they're just hidden behind a click on the row. Expanded state is remembered per message
            // so dnd5e's re-render on update doesn't snap it shut again.
            {
                const root = html instanceof HTMLElement ? html : html[0];
                const rows = root?.querySelectorAll(".chat-card > .icon-row:has(> i.fa-tag):has(> ul.pills)") ?? [];
                for (const row of rows) {
                    if (row.classList.contains("rm-tags")) continue;
                    row.classList.add("rm-tags");
                    const toggle = document.createElement("span");
                    toggle.className = "rm-tags-toggle";
                    toggle.innerHTML = '<span class="rm-tags-toggle-label"></span><i class="fa-solid fa-chevron-down rm-tags-caret" inert></i>';
                    row.append(toggle);
                    const setCollapsed = (collapsed) => {
                        row.classList.toggle("collapsed", collapsed);
                        toggle.querySelector(".rm-tags-toggle-label").textContent = game.i18n.localize(
                            collapsed ? "rm.chat.expandTags" : "rm.chat.collapseTags",
                        );
                    };
                    setCollapsed(!_expandedTagRows.has(message.id));
                    row.addEventListener("click", (event) => {
                        // Clicks on a pill (e.g. a future interactive tag) shouldn't toggle the row.
                        if (event.target.closest(".pill")) return;
                        const collapsed = !row.classList.contains("collapsed");
                        setCollapsed(collapsed);
                        if (collapsed) _expandedTagRows.delete(message.id);
                        else _expandedTagRows.add(message.id);
                    });
                }
            }

            // dnd5e's _trayStates saves open=false from the unprocessed initial render
            // and restores it on re-render via ??, overriding the "manual"/"never" setting.
            // Force the tray open after the processed re-render.
            if (message.flags?.[MODULE_SHORT]?.processed) {
                const setting = game.settings.get("dnd5e", "autoCollapseChatTrays");
                if (setting === "manual" || setting === "never") {
                    const root = html instanceof HTMLElement ? html : html[0];
                    const da = root?.querySelector("damage-application");
                    if (da && !da.hasAttribute("open")) {
                        da.toggleAttribute("open", true);
                    }
                }
            }
        });

        AcknowledgedModeUtility.registerApplyListener();
        AcknowledgedModeUtility.registerSocketListener();
        // roll-model's own save-button interception (embedded saves) is retired on dnd5e 6.0: the
        // system now rolls per-target saves itself and lists them as summary rows on the usage card.
        ChatUtility.registerSaveSocketListener();

        Hooks.on("controlToken", () => {
            requestAnimationFrame(() => {
                ChatUtility.updateAllSaveButtonStates();
                ChatUtility.updateAllSaveMultipliers();
            });
        });
    }

    static registerSceneControlHooks() {
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
        const showDialog = game.user.getFlag(MODULE_NAME, "alwayshpShowDialog") !== false;
        if (showDialog && AlwaysHPWidget.canLoad()) HPManager.toggleApp(true);

        ChatUtility.setupScrollListener();

        Hooks.on("controlToken", () => {
            HPManager.refresh();
            if (!ChatUtility._chatPinnedToBottom) return;
            clearTimeout(ChatUtility._controlTokenTimer);
            ChatUtility._controlTokenTimer = setTimeout(() => {
                if (!ChatUtility._chatPinnedToBottom) return;
                ui.chat.scrollBottom?.();
            }, 200);
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

    static registerActorSheetHooks() {
        Hooks.on("renderCharacterActorSheet", (app, html) => {
            _renderPortentRollsOnSheet(app.actor, html);
        });
    }
}

function _safeKeysLocal(obj) {
    if (obj === undefined) return "undefined";
    if (obj === null) return "null";
    try {
        return `{${Object.keys(obj).join(",")}}`;
    } catch {
        return String(obj);
    }
}

function _portentDieHtml(entry, index) {
    const value = typeof entry === "number" ? entry : entry.value;
    const used = typeof entry === "number" ? false : entry.used;
    const color = used ? "#555" : value === 20 ? "#ffd700" : value === 1 ? "#e05050" : "#88aaff";
    const bg = used ? "#111" : "#1a1a2e";
    const border = used ? "#444" : color;
    return `<span class="portent-die${used ? " portent-die--used" : ""}"
        data-portent-index="${index}"
        title="${used ? `${value} — used` : value}"
        style="display:inline-block;background:${bg};color:${color};border:1px solid ${border};border-radius:4px;padding:1px 8px;font-size:1em;font-weight:bold;margin:0 2px;opacity:${used ? "0.4" : "1"};cursor:default">${value}</span>`;
}

function _portentSectionHtml(rolls, featName, featImg) {
    const dieTags = rolls.map((e, i) => _portentDieHtml(e, i)).join("");
    return `<section class="card-section">
        <div class="card-row" style="display:flex;align-items:center;gap:8px;padding:4px 8px 2px">
            <img src="${featImg}" width="36" height="36" style="border:none;border-radius:4px;flex-shrink:0"/>
            <div class="name-stacked">
                <span class="title">${featName}</span>
                <span class="subtitle">Long Rest — foretelling rolls</span>
            </div>
        </div>
        <div style="display:flex;gap:4px;padding:4px 8px 8px">${dieTags}</div>
    </section>`;
}

async function _rollPortentDice(actor, config) {
    if (config?.type !== "long") return;
    if (actor?.type !== "character") return;
    if (!_canRefreshActorInspiration(actor)) return;

    const hasGreaterPortent = _hasItem(actor, "Greater Portent");
    const hasPortent = hasGreaterPortent || _hasItem(actor, "Portent");
    if (!hasPortent) return;

    const diceCount = hasGreaterPortent ? 3 : 2;
    const roll = new Roll(`${diceCount}d20`);
    await roll.evaluate();

    const rolls = roll.dice[0].results.map((r) => ({ value: r.result, used: false }));
    await actor.setFlag(MODULE_NAME, "portentRolls", rolls);

    const featName = hasGreaterPortent ? "Greater Portent" : "Portent";
    const featImg = hasGreaterPortent ? "icons/magic/perception/orb-crystal-ball-scrying-blue.webp" : "icons/magic/perception/orb-eye-scrying.webp";

    const portentSection = _portentSectionHtml(rolls, featName, featImg);

    const restMessage = game.messages.contents
        .slice()
        .reverse()
        .find((m) => m.speaker?.actor === actor.id);
    if (restMessage) {
        const doc = new DOMParser().parseFromString(restMessage.content, "text/html");
        const card = doc.querySelector(".chat-card") ?? doc.body;
        card.insertAdjacentHTML("beforeend", portentSection);
        await restMessage.update({
            content: doc.body.innerHTML,
            flags: { [MODULE_NAME]: { portentActorId: actor.id } },
        });
    } else {
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<div class="dnd5e2 chat-card">${portentSection}</div>`,
            flags: { [MODULE_NAME]: { portentActorId: actor.id } },
        });
    }
}

async function _postPortentChatCard(actor) {
    const rolls = actor.getFlag(MODULE_NAME, "portentRolls");
    if (!rolls?.length) return;

    const hasGreaterPortent = _hasItem(actor, "Greater Portent");
    const featName = hasGreaterPortent ? "Greater Portent" : "Portent";
    const featImg = hasGreaterPortent ? "icons/magic/perception/orb-crystal-ball-scrying-blue.webp" : "icons/magic/perception/orb-eye-scrying.webp";

    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="dnd5e2 chat-card">${_portentSectionHtml(rolls, featName, featImg)}</div>`,
        flags: { [MODULE_NAME]: { portentActorId: actor.id, portentStandalone: true } },
    });
}

function _attachPortentClickHandlers(message, html) {
    const actorId = message.flags?.[MODULE_NAME]?.portentActorId;
    if (!actorId) return;
    if (!message.flags?.[MODULE_NAME]?.portentStandalone) return;

    const root = html instanceof HTMLElement ? html : html[0];
    root.querySelectorAll(".portent-die:not(.portent-die--used)").forEach((el) => {
        el.style.cursor = "pointer";
        el.title = `${el.title} — click to use`;
        el.addEventListener("click", async () => {
            const actor = game.actors.get(actorId);
            if (!actor?.isOwner) return;

            const idx = parseInt(el.dataset.portentIndex);
            const rolls = foundry.utils.deepClone(actor.getFlag(MODULE_NAME, "portentRolls") ?? []);
            if (!rolls[idx] || rolls[idx].used) return;

            rolls[idx].used = true;
            await actor.setFlag(MODULE_NAME, "portentRolls", rolls);

            const doc = new DOMParser().parseFromString(message.content, "text/html");
            const dieEl = doc.querySelector(`[data-portent-index="${idx}"]`);
            if (dieEl) {
                const val = rolls[idx].value;
                dieEl.className = "portent-die portent-die--used";
                dieEl.style.cssText = `display:inline-block;background:#111;color:#555;border:1px solid #444;border-radius:4px;padding:1px 8px;font-size:1em;font-weight:bold;margin:0 2px;opacity:0.4;cursor:default`;
                dieEl.title = `${val} — used`;
            }
            await message.update({ content: doc.body.innerHTML });
        });
    });
}

function _renderPortentRollsOnSheet(actor, html) {
    if (!actor) return;
    const portentRolls = actor.getFlag(MODULE_NAME, "portentRolls");
    if (!portentRolls?.length) return;

    const portentItem = actor.items.find((i) => i.name === "Greater Portent") ?? actor.items.find((i) => i.name === "Portent");
    if (!portentItem) return;

    const root = html instanceof HTMLElement ? html : html[0];
    if (!root) return;

    const itemRow = root.querySelector(`[data-item-id="${portentItem.id}"], [data-entry-id="${portentItem.id}"]`);
    if (!itemRow) return;

    const nameEl = itemRow.querySelector(".item-name .title, .item-name, .name .title, .name, h3");
    if (!nameEl) return;

    itemRow.querySelector(".portent-rolls-display")?.remove();

    const wrapper = document.createElement("span");
    wrapper.className = "portent-rolls-display";
    wrapper.title = "Click to show portent rolls";
    wrapper.style.cssText = "display:inline-flex;gap:3px;margin-left:8px;align-items:center;vertical-align:middle;cursor:pointer;";
    wrapper.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        _postPortentChatCard(actor);
    });

    for (const entry of portentRolls) {
        const value = typeof entry === "number" ? entry : entry.value;
        const used = typeof entry === "number" ? false : entry.used;
        const color = used ? "#555" : value === 20 ? "#ffd700" : value === 1 ? "#e05050" : "#88aaff";
        const pip = document.createElement("span");
        pip.title = used ? `${value} — used` : `${value}`;
        pip.textContent = value;
        pip.style.cssText = `display:inline-block;background:${used ? "#111" : "#1a1a2e"};color:${color};border:1px solid ${used ? "#444" : color};border-radius:3px;padding:0 5px;font-size:0.75em;font-weight:bold;line-height:1.7;opacity:${used ? "0.4" : "1"};`;
        wrapper.appendChild(pip);
    }

    nameEl.appendChild(wrapper);
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

function _applyInitiativeRerollPatch() {
    libWrapper.register(
        MODULE_NAME,
        "Actor.prototype.rollInitiative",
        async function (wrapped, options = {}, rollOptions = {}) {
            if (game.combat) {
                const combatants = this.isToken
                    ? this.getActiveTokens(false, true).reduce(
                          (arr, t) => arr.concat(game.combat.getCombatantsByToken(t.id)),
                          []
                      )
                    : game.combat.getCombatantsByActor(this.id);
                const toReset = combatants.filter((c) => c.initiative !== null);
                if (toReset.length) {
                    await game.combat.updateEmbeddedDocuments(
                        "Combatant",
                        toReset.map((c) => ({ _id: c.id, initiative: null }))
                    );
                }
            }
            return wrapped(options, rollOptions);
        },
        "WRAPPER"
    );
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
    // Core only records movement history when TokenDocument#_shouldRecordMovementHistory
    // says so (its documented preUpdate extension point), so overriding that is enough.
    // Wrap it with libWrapper at `setup` rather than swapping CONFIG.Token.documentClass
    // for a subclass at `init`: by `setup` every system/module `init` hook has installed
    // its final document class, so the wrapper lands on whatever class actually ended up
    // in CONFIG and survives any later reassignment; and libWrapper reports another module
    // touching the same method instead of one of us silently losing the patch. Being a
    // wrapper it can also be removed again, so the setting toggles live on every client.
    const TARGET = "CONFIG.Token.documentClass.prototype._shouldRecordMovementHistory";
    let applied = false;

    const sync = () => {
        const wanted = _getPreventMovementHistorySetting();
        if (wanted && !applied) {
            libWrapper.register(MODULE_NAME, TARGET, function () { return false; }, "OVERRIDE");
            applied = true;
        } else if (!wanted && applied) {
            libWrapper.unregister(MODULE_NAME, TARGET, false);
            applied = false;
        }
    };

    Hooks.once("setup", sync);
    Hooks.on("updateSetting", (setting) => {
        if (setting.key === `${MODULE_NAME}.${SETTING_NAMES.PREVENT_MOVEMENT_HISTORY}`) sync();
    });
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
        g.lineStyle(3, 0xdd44ff, 1.0);
        const cl = Math.round(size * 0.28);
        g.moveTo(0, cl).lineTo(0, 0).lineTo(cl, 0);
        g.moveTo(w - cl, 0)
            .lineTo(w, 0)
            .lineTo(w, cl);
        g.moveTo(0, h - cl)
            .lineTo(0, h)
            .lineTo(cl, h);
        g.moveTo(w - cl, h)
            .lineTo(w, h)
            .lineTo(w, h - cl);

        const label = new PIXI.Text(
            "S",
            new PIXI.TextStyle({
                fontFamily: "serif",
                fontSize: Math.round(size * 0.45),
                fontWeight: "bold",
                fill: 0xdd44ff,
                stroke: 0x000000,
                strokeThickness: 3,
            })
        );
        label.anchor.set(0.5, 0.5);
        label.x = w / 2;
        label.y = h / 2;
        g.addChild(label);
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
