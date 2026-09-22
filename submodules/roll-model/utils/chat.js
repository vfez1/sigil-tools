import { MODULE_NAME, MODULE_SHORT } from "../../shared/const.js";
import { TEMPLATE } from "../config/templates.js";
import { ActivityUtility } from "./activity.js";
import { CoreUtility } from "./core.js";
import { DialogUtility } from "./dialog.js";
import { RenderUtility } from "./render.js";
import { ROLL_STATE, ROLL_TYPE, RollUtility } from "./roll.js";
import { LogUtility } from "./log.js";

/**
 * Enumerable of identifiers for different message types that can be made.
 * @enum {String}
 */
export const MESSAGE_TYPE = {
    ROLL: "roll",
    USAGE: "usage",
};

/**
 * Utility class to handle binding chat cards for use by the module.
 */
export class ChatUtility {
    /**
     * Process a given chat message, adding module content and events to it.
     * Does nothing if the message is not the correct type.
     * @param {ChatMessage} message The chat message to process.
     * @param {JQuery} html The object data for the chat message.
     */
    static async processChatMessage(message, html) {
        if (!message || !html) {
            return;
        }

        LogUtility.log(
            `[RM DEBUG] processChatMessage ENTER messageId=${message?.id} type=${message?.type} user=${game.user?.name} isGM=${game.user?.isGM} isAuthor=${message?.isAuthor} isOwner=${message?.isOwner} isContentVisible=${message?.isContentVisible} rollCount=${message?.rolls?.length} flags=${message?.flags ? JSON.stringify(Object.keys(message.flags)) : "none"} rmFlags=${JSON.stringify(message?.flags?.[MODULE_SHORT])}`
        );

        // Initiative: core's Combat#rollInitiative creates the message itself (dnd5e's _preCreate then
        // retypes it to "check" / system.type "initiative"), so roll-model's pre-roll hooks never get
        // to stamp it. Treat it as processed so it gets the standalone-card treatment (breakdown
        // popover + reroll) like any other check. Nothing is persisted — flags are set in memory only.
        if (message.type === "check" && message.system?.type === "initiative" && !message.flags?.[MODULE_SHORT]?.quickRoll) {
            message.flags[MODULE_SHORT] = { ...(message.flags[MODULE_SHORT] ?? {}), quickRoll: true, processed: true, isInitiative: true };
            LogUtility.log(`[RM DEBUG] processChatMessage: initiative check card messageId=${message.id} — marking as quickRoll/processed in memory.`);
        }

        if (!message.flags || Object.keys(message.flags).length === 0) {
            LogUtility.log(`[RM DEBUG] processChatMessage EXIT: message has no flags at all.`);
            return;
        }

        if (!message.flags[MODULE_SHORT] || !message.flags[MODULE_SHORT].quickRoll) {
            LogUtility.log(
                `[RM DEBUG] processChatMessage EXIT: no rm flags or not a quickRoll (rmFlags=${JSON.stringify(message.flags[MODULE_SHORT])}). ` +
                    `If you expected a quick-rolled attack/damage card here, processActivity/processRoll never set quickRoll=true for this message.`
            );
            // Clear stale flavor text for enricher damage messages (dnd5e 5.3 moved the key)
            if (message.flags.dnd5e?.messageType === "roll" && !message.flags.dnd5e?.item?.id) {
                $(html).find(".flavor-text").text("");
            }
            return;
        }

        const type = ChatUtility.getMessageType(message);
        LogUtility.log(`[RM DEBUG] processChatMessage: messageType=${type} processed=${message.flags[MODULE_SHORT].processed}`);

        // Hide the message if we haven't yet finished processing RSR content
        if (!message.flags[MODULE_SHORT].processed) {
            await $(html).addClass("rm-hide");

            if (type == ROLL_TYPE.ACTIVITY && message.isAuthor) {
                LogUtility.log(`[RM DEBUG] processChatMessage: unprocessed activity message, calling runActivityActions().`);
                ActivityUtility.runActivityActions(message);
            } else {
                LogUtility.log(`[RM DEBUG] processChatMessage EXIT: unprocessed, but not an activity message authored by us (type=${type}, isAuthor=${message.isAuthor}) — nothing further will happen to this card.`);
            }

            return;
        }

        const content = $(html).find(".message-content");

        {
            const htmlEl = html instanceof HTMLElement ? html : html?.[0];
            LogUtility.log(
                `[RM DEBUG] processChatMessage: content.length=${content.length} htmlTag=${htmlEl?.tagName} htmlIsConnected=${htmlEl?.isConnected} htmlClasses=${htmlEl?.className}`
            );
        }

        if (content.length === 0) {
            LogUtility.logWarning(`[RM DEBUG] processChatMessage EXIT: .message-content not found in the html passed to this hook call — skipping _injectContent. This may be a render-timing race.`, { ui: false });
            await $(html).removeClass("rm-hide");
            if (ChatUtility._chatPinnedToBottom) requestAnimationFrame(() => ChatUtility._scrollToBottom());
            return;
        }

        try {
            await _injectContent(message, type, content);
        } catch (e) {
            LogUtility.logError(`[RM DEBUG] processChatMessage: _injectContent THREW for messageId=${message.id} (user=${game.user?.name}): ${e?.message}`, { ui: false });
            console.error(e);
        }
        LogUtility.log(
            `[RM DEBUG] processChatMessage: injection done messageId=${message.id} user=${game.user?.name} attackRow=${content.find(".rm-section-attack").length} damageRow=${content.find(".rm-section-damage").length} hidden=${$(html).hasClass("rm-hide")} processed=${message.flags[MODULE_SHORT].processed}`
        );
        content[0]?.dispatchEvent(new CustomEvent("rm-inject-complete", { bubbles: true }));

        // Setup hover buttons when the message is actually hovered(for optimisation).
        let hoverSetupComplete = false;
        content.hover(async () => {
            if (!hoverSetupComplete) {
                hoverSetupComplete = true;
                await _injectOverlayButtons(message, content);
                _onOverlayHover(message, content);
            }
        });

        if (message.flags[MODULE_SHORT].processed) {
            await $(html).removeClass("rm-hide");
        }

        if (ChatUtility._chatPinnedToBottom) {
            requestAnimationFrame(() => ChatUtility._scrollToBottom());
            // Re-scroll if late-inflating content (e.g. <damage-application>) grows the card after our rAF
            ChatUtility._watchAndScrollBottom(message.id);
        } else {
            // Scrolled-up case: if we have an anchor for this message (user clicked Apply while scrolled up),
            // compensate scrollTop for however much the card grew so the user's view stays in place.
            const anchor = ChatUtility._scrollAnchor;
            if (anchor?.messageId === message.id) {
                ChatUtility._scrollAnchor = null;
                const startHeight = anchor.cardHeight;
                requestAnimationFrame(() => {
                    const msgEl = document.querySelector(`[data-message-id="${message.id}"]`);
                    if (!msgEl) return;
                    const el = ChatUtility._chatLogScrollEl;
                    if (!el) return;
                    // Scroll down by however much the card grew, keeping content below the apply button in place.
                    // Also watch for late tray re-inflation and keep compensating.
                    let lastHeight = msgEl.offsetHeight;
                    const growth = lastHeight - startHeight;
                    if (growth > 0) el.scrollTop += growth;
                    const ro = new ResizeObserver(() => {
                        const h = msgEl.offsetHeight;
                        const g = h - lastHeight;
                        if (g > 0 && ChatUtility._chatLogScrollEl) {
                            ChatUtility._chatLogScrollEl.scrollTop += g;
                        }
                        lastHeight = h;
                    });
                    ro.observe(msgEl);
                    setTimeout(() => ro.disconnect(), 1500);
                });
            }
        }
    }

    // Registers a scroll listener on the chat log to track whether the user is pinned
    // to the bottom. Call once on ready. Drives controlToken scroll.
    static setupScrollListener() {
        const rawEl = ui.chat?.element;
        const root = rawEl instanceof HTMLElement ? rawEl : rawEl?.[0];
        if (!root) return;

        // Find the actual scrollable child by computed overflow style
        ChatUtility._chatLogScrollEl = Array.from(root.querySelectorAll("*")).find(el => {
            const s = window.getComputedStyle(el);
            return s.overflowY === "auto" || s.overflowY === "scroll" || s.overflow === "auto" || s.overflow === "scroll";
        }) ?? null;
        // Capture phase catches scroll on any scrollable child; e.target is the actual scrolling element
        root.addEventListener("scroll", (e) => {
            const t = e.target;
            ChatUtility._chatLogScrollEl = t;
            const dist = t.scrollHeight - t.scrollTop - t.clientHeight;
            if (dist <= 20) ChatUtility._chatPinnedToBottom = true;
            else if (dist > 100) ChatUtility._chatPinnedToBottom = false;
        }, { passive: true, capture: true });
    }

    static _scrollToBottom() {
        const el = ChatUtility._chatLogScrollEl;
        if (el) el.scrollTop = el.scrollHeight;
        else ui.chat.scrollBottom();
    }

    static _watchAndScrollBottom(messageId) {
        if (!messageId) return;
        const li = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!li) return;
        let raf;
        const ro = new ResizeObserver(() => {
            if (!ChatUtility._chatPinnedToBottom) { ro.disconnect(); return; }
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const el = ChatUtility._chatLogScrollEl;
                if (el) el.scrollTop = el.scrollHeight;
            });
        });
        ro.observe(li);
        setTimeout(() => ro.disconnect(), 1500);
    }

    /**
     * Updates a given chat message, saving changes to the database.
     * @param {ChatMessage} message The chat message to update.
     * @param {Object} update The object data for the message update.
     */
    static async updateChatMessage(message, update = {}, context = {}) {
        if (message instanceof ChatMessage) {
            await message.update(update, context);
        }
    }

    /**
     * Flag sub-key for an item's damage-type preferences. UUID dots are replaced so setFlag/getFlag
     * don't expand the key as a nested path.
     * @param {Item} item
     * @returns {string}
     */
    static damageTypePrefKey(item) {
        return item.uuid.replaceAll(".", "_");
    }

    /**
     * Apply this user's saved damage-type preferences for an item to a set of damage roll configs
     * (from dnd5e.preRollDamageV2) before the rolls are built, so the chosen type is what gets
     * persisted on the message.
     * @param {Item} item
     * @param {object[]} rollConfigs config.rolls entries, each with an options.{type,types}
     */
    static applyDamageTypePrefs(item, rollConfigs) {
        if (!item?.uuid || !rollConfigs?.length) return;
        const prefs = game.user.getFlag(MODULE_NAME, `damageTypePrefs.${ChatUtility.damageTypePrefKey(item)}`);
        if (!prefs) return;
        rollConfigs.forEach((rc, i) => {
            const pref = prefs[i];
            const types = rc.options?.types;
            if (!pref || !(types?.length > 1) || !types.includes(pref)) return;
            rc.options.type = pref;
        });
    }

    static getMessageType(message) {
        // dnd5e 6.0: the message "kind" moved from flags.dnd5e.messageType + flags.dnd5e.roll.type
        // (which are now largely absent) onto message.type directly (e.g. "attack", "damage",
        // "save", "check", "healing", "usage"). "check" covers ability/skill/tool checks alike,
        // disambiguated by message.system.skill / message.system.tool.
        LogUtility.log(`[RM DEBUG] getMessageType: message.type=${message.type} system.skill=${message.system?.skill} system.tool=${message.system?.tool} flags.dnd5e=${message.flags.dnd5e ? JSON.stringify(Object.keys(message.flags.dnd5e)) : "none"}`);

        switch (message.type) {
            case "usage":
                return ROLL_TYPE.ACTIVITY;
            case "attack":
                return ROLL_TYPE.ATTACK;
            case "damage":
                return ROLL_TYPE.DAMAGE;
            case "healing":
                return ROLL_TYPE.HEALING;
            case "save":
                return ROLL_TYPE.ABILITY_SAVE;
            case "check":
                if (message.system?.skill) return ROLL_TYPE.SKILL;
                if (message.system?.tool) return ROLL_TYPE.TOOL;
                return ROLL_TYPE.ABILITY_TEST;
        }

        // Pre-6.0 fallback, kept in case some message paths still use the old flag shape.
        if (message.flags.dnd5e?.messageType === MESSAGE_TYPE.USAGE) {
            return ROLL_TYPE.ACTIVITY;
        }
        if (message.flags.dnd5e?.messageType === MESSAGE_TYPE.ROLL) {
            return message.flags.dnd5e?.roll?.type ?? null;
        }
        return null;
    }

    static getActivityType(message) {
        return message.flags.dnd5e?.activity.type;
    }

    static getActorFromMessage(message) {
        let actor = null;
        if (message.speaker.token) {
            const token = game.scenes.get(message.speaker.scene).tokens.get(message.speaker.token);
            actor = token?.actor;
        } else if (message.speaker.actor) {
            actor = game.actors.get(message.speaker.actor);
        }

        return actor;
    }

    static isMessageMultiRoll(message) {
        return (
            (message.flags[MODULE_SHORT].advantage ||
                message.flags[MODULE_SHORT].disadvantage ||
                message.flags[MODULE_SHORT].dual ||
                (message.rolls[0] instanceof CONFIG.Dice.D20Roll && message.rolls[0].options.advantageMode !== CONFIG.Dice.D20Roll.ADV_MODE.NORMAL)) ??
            false
        );
    }

    static isMessageCritical(message) {
        return message.flags[MODULE_SHORT].isCritical ?? false;
    }

    static updateAllSaveButtonStates() {
        for (const message of game.messages) {
            if (message.type !== "usage" || !message.system?.outcomes?.size) continue;
            const li = document.querySelector(`[data-message-id="${message.id}"]`);
            if (!li) continue;
            _updateSaveButtonState(li, message);
        }
    }

    static registerSaveSocketListener() {
        game.socket.on(`module.${MODULE_NAME}`, async (data) => {
            if (!game.user.isGM) return;

            if (data.type === "retroSave") {
                const message = game.messages.get(data.messageId);
                if (!message) return;
                const upgradedRoll = CONFIG.Dice.D20Roll.fromData(data.rollJSON);
                const rolls = message.rolls.map(r =>
                    (r.options?.embeddedSave && r.options?.embeddedSaveSpeaker === data.speaker) ? upgradedRoll : r
                );
                await ChatUtility.updateChatMessage(message, { rolls });
                return;
            }

            if (data.type === "retroDamage") {
                const message = game.messages.get(data.messageId);
                if (!message) return;
                const updatedRolls = data.rollsJSON.map(r => CONFIG.Dice.DamageRoll.fromData(r));
                const rolls = message.rolls.map(r =>
                    r instanceof CONFIG.Dice.DamageRoll ? updatedRolls.shift() ?? r : r
                );
                await ChatUtility.updateChatMessage(message, { flags: data.flags, rolls });
                return;
            }

            if (data.type !== "embeddedSave") return;

            const message = game.messages.get(data.messageId);
            if (!message) return;

            const d20Roll = CONFIG.Dice.D20Roll.fromData(data.rollJSON);
            const { speakerName, ability } = data;

            const filteredRolls = message.rolls.filter(r =>
                !r.options?.embeddedSave || r.options?.embeddedSaveSpeaker !== speakerName
            );
            filteredRolls.push(d20Roll);

            const existingSaves = message.flags[MODULE_SHORT]?.embeddedSaves ?? {};
            existingSaves[speakerName] = { ability };

            await ChatUtility.updateChatMessage(message, {
                rolls: filteredRolls,
                [`flags.${MODULE_SHORT}.embeddedSaves`]: existingSaves,
            });
        });
    }

    static registerSaveListener() {
        if (ChatUtility._saveListenerRegistered) return;
        ChatUtility._saveListenerRegistered = true;

        document.addEventListener(
            "click",
            async (event) => {
                const target = event.target instanceof Element ? event.target.closest('[data-action="rollSave"]') : null;
                if (!target) return;

                const li = target.closest("[data-message-id]");
                if (!li) return;

                const message = game.messages.get(li.dataset.messageId);
                if (!message) return;

                event.stopImmediatePropagation();
                event.preventDefault();

                await _processSaveButtonEvent(message, target, event);
            },
            true
        );
    }

    static updateAllSaveMultipliers() {
        for (const message of game.messages) {
            const embeddedSaves = message.flags?.[MODULE_SHORT]?.embeddedSaves;
            if (!embeddedSaves) continue;
            const li = document.querySelector(`[data-message-id="${message.id}"]`);
            if (!li) continue;
            _autoSetHalfDamageForFailedSaves(message, li);
        }
    }

}

/**
 * Handles hover begin events on the given html/jquery object.
 * @param {ChatMessage} message The chat message to process.
 * @param {JQuery} html The object to handle hover begin events for.
 * @private
 */
function _onOverlayHover(message, html) {
    const actor = message.getAssociatedActor?.();
    const hasPermission = game.user.isGM || message?.isAuthor || actor?.isOwner;
    const isItem = message.flags.dnd5e?.activity !== undefined;

    // Save-section overlays are handled by per-section hover in _injectOverlayRetroButtons
    const saveOverlays = html.find("[data-save-speaker] .rm-overlay");
    html.find(".rm-overlay").not(saveOverlays).show();
    const saveMultiRollOverlays = html.find("[data-save-speaker] .rm-overlay-multiroll");
    html.find(".rm-overlay-multiroll").not(saveMultiRollOverlays).toggle(hasPermission && !ChatUtility.isMessageMultiRoll(message));
    html.find(".rm-overlay-crit").toggle(hasPermission && isItem);
}

/**
 * Handles hover end events on the given html/jquery object.
 * @param {JQuery} html The object to handle hover end events for.
 * @private
 */
function _onOverlayHoverEnd(html) {
    html.find(".rm-overlay").attr("style", "display: none;");
}

/**
 * Adds all manual action button event handlers to a chat card.
 * Note that the actual buttons are created during rendering and not added here.
 * @param {ChatMessage} message The chat message to process.
 * @param {JQuery} html The object to add button handlers to.
 */
function _setupCardListeners(message, html) {
    html.find(".rm-roll-actions [data-state]").click(async (event) => {
        await _processRetroAdvButtonEvent(message, event);
    });
    html.find(".rm-roll-actions [data-type='crit']").click(async (event) => {
        await _processRetroCritButtonEvent(message, event);
    });
    html.find(".rm-roll-actions [data-type='max']").click(async (event) => {
        await _processRetroMaxButtonEvent(message, event);
    });

    const typePills = html.find(".rm-type-pill");
    LogUtility.log(`[RM DEBUG] _setupCardListeners messageId=${message.id} user=${game.user?.name} typePills=${typePills.length} readonlyPills=${typePills.filter(".rm-readonly").length}`);
    typePills.click(async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const pill = $(event.currentTarget);
        const selector = pill.closest(".rm-type-selector");
        const newType = pill.data("type");
        const partIndex = Number(pill.data("part"));
        const label = CONFIG[MODULE_SHORT]?.combinedDamageTypes?.[newType] ?? newType;

        LogUtility.log(
            `[RM DEBUG] type pill CLICK messageId=${message.id} user=${game.user?.name} newType=${newType} part=${partIndex} readonly=${pill.hasClass("rm-readonly")} isOwner=${message.isOwner} item=${message.getAssociatedItem?.()?.name} itemOwner=${message.getAssociatedItem?.()?.isOwner}`
        );
        if (pill.hasClass("rm-readonly")) return;

        selector.find(".rm-type-pill").removeClass("active");
        pill.addClass("active");

        // Apply the type to the stored roll so the breakdown / any consumer sees it, and persist
        // it on the message so every client (and re-renders) agree.
        const damageRolls = message.rolls.filter((r) => r instanceof CONFIG.Dice.DamageRoll);
        const roll = damageRolls[partIndex];
        LogUtility.log(`[RM DEBUG] type pill: damageRolls=${damageRolls.length} rollFound=${!!roll} currentType=${roll?.options?.type} types=${JSON.stringify(roll?.options?.types)}`);
        if (roll) {
            roll.options.type = newType;
            if (message.isOwner) {
                await ChatUtility.updateChatMessage(message, { rolls: message.rolls });
            }
        }

        // The damage tray needs no direct update: the message update above re-renders the card and
        // the 6.0 <damage-application> rebuilds itself from the message's rolls on connect.

        // Persist the preference for this user's future rolls of the item. This deliberately lives
        // on the User document rather than as an item flag: an embedded-item write is a full actor
        // update (Actor.reset + prepareData + open sheet re-render + canvas refresh — a ~400ms main
        // thread stall on Chrome, far worse on Firefox), whereas a User flag write touches nothing.
        const item = message.getAssociatedItem?.();
        if (item?.uuid) {
            await game.user.setFlag(MODULE_NAME, `damageTypePrefs.${ChatUtility.damageTypePrefKey(item)}.${partIndex}`, newType);
            LogUtility.log(`[RM DEBUG] type pill: saved pref ${partIndex}=${newType} for ${item.name} on user ${game.user.name}`);
        }
    });

    html.find(`[data-action='rm-${ROLL_TYPE.CONCENTRATION}']`).click(async (event) => {
        await _processBreakConcentrationButtonEvent(message, event);
    });

    html.find(".rm-gwm-toggle input").change(async (event) => {
        await _processGwmToggleEvent(message, event);
    });

    html.find(".rm-celestial-revelation input").change(async (event) => {
        await _processCelestialToggleEvent(message, event);
    });

    // Mark the save button passed/failed/already-rolled for the controlled token(s).
    if (message.type === "usage" && message.system?.outcomes?.size) {
        _updateSaveButtonState(html[0] ?? html, message);
    }
}

async function _injectContent(message, type, html) {
    const parent = message.getOriginatingMessage();
    message.flags[MODULE_SHORT].displayChallenge = parent?.shouldDisplayChallenge ?? message.shouldDisplayChallenge;
    message.flags[MODULE_SHORT].displayAttackResult = game.user.isGM || game.settings.get("dnd5e", "attackRollVisibility") !== "none";

    switch (type) {
        case ROLL_TYPE.DAMAGE:
            // Standalone damage (enrichers such as a weapon mastery's "[[/damage]]" link): no item
            // behind it, so there's no activity card to merge into — replace dnd5e's own roll row
            // with roll-model's damage row in place.
            if (!(message.system?.item?.uuid ?? message.flags.dnd5e?.item?.id)) {
                // dnd5e 6.0 renders the roll as "section.icon-row > button.dice-roll + .roll-breakdown";
                // older versions as a bare "div.dice-roll". Take the whole row so nothing is orphaned.
                const nativeRow = html.find(".icon-row").has(".dice-roll").first();
                const enricher = nativeRow.length ? nativeRow : html.find(".dice-roll").first();

                html.parent().find(".flavor-text").text("");

                message.flags[MODULE_SHORT].renderDamage = true;
                message.flags[MODULE_SHORT].isCritical = message.rolls[0]?.isCritical;

                await _injectDamageRoll(message, enricher);
                enricher.remove();
                _wireRollPopovers(html);
                break;
            }
        case ROLL_TYPE.ATTACK:
            if (parent && parent.flags[MODULE_SHORT] && message.isAuthor) {
                if (type === ROLL_TYPE.ATTACK) {
                    parent.flags[MODULE_SHORT].renderAttack = true;
                    parent.flags.dnd5e.roll = message.flags.dnd5e?.roll;
                    parent.flags.dnd5e.originatingMessage = parent.id;
                    game.dnd5e.registry.messages.track(parent);
                }

                if (type === ROLL_TYPE.DAMAGE) {
                    parent.flags[MODULE_SHORT].renderDamage = true;
                    parent.flags[MODULE_SHORT].isCritical = message.rolls[0]?.isCritical;
                    parent.flags[MODULE_SHORT].isHealing = message.flags.dnd5e.activity.type === "heal";
                }

                parent.flags[MODULE_SHORT].quickRoll = true;
                parent.rolls.push(...message.rolls);

                ChatUtility.updateChatMessage(parent, {
                    flags: parent.flags,
                    rolls: parent.rolls,
                    flavor: "vanilla",
                });

                message.flags[MODULE_SHORT].processed = false;
                message.delete();
                return;
            }
            break;
        case ROLL_TYPE.SKILL:
        case ROLL_TYPE.ABILITY_SAVE:
        case ROLL_TYPE.ABILITY_TEST:
        case ROLL_TYPE.DEATH_SAVE:
        case ROLL_TYPE.TOOL:
            if (!message.isContentVisible) {
                return;
            }

            const roll = message.rolls[0];
            roll.options.displayChallenge = message.flags[MODULE_SHORT].displayChallenge;
            // dnd5e 6.0 moved forceSuccess from the (now largely absent) flags.dnd5e.roll onto
            // a system-data getter (RollMessageData#forceSuccess / SaveMessageData#forceSuccess).
            roll.options.forceSuccess = message.system?.forceSuccess ?? message.flags.dnd5e?.roll?.forceSuccess;

            // Initiative rolled straight from the tracker (no dialog) is built by
            // Actor5e#getInitiativeRoll without the postBuild hooks, so the roll carries no captured
            // parts. Rebuild them from the actor's current initiative config so the popover can
            // still list modifier / proficiency / effect bonuses.
            if (message.system?.type === "initiative" && !roll.options?.bonusParts?.length) {
                _captureInitiativeParts(message, roll);
            }

            // dnd5e 6.0 standalone check/save cards: keep the system's compact roll button as is
            // (vanilla look) and only swap its breakdown popover for the itemised one used on the
            // activity cards' attack row and the save-summary rows — dice line (both d20s for
            // adv/dis), one line per bonus source, total, plus adv/dis reroll toggles for owners.
            _enhanceStandaloneRoll(message, html, roll, type);

            // Concentration: dnd5e itself only offers "break concentration" on a failed save (an
            // icon button in the actions row). Restyle that into a labelled full-width button; on a
            // success there is nothing to show.
            _restyleBreakConcentrationButton(message, html);
            break;
        case ROLL_TYPE.ACTIVITY:
            LogUtility.log(
                `[RM DEBUG] _injectContent(ACTIVITY) ENTER messageId=${message.id} user=${game.user?.name} isContentVisible=${message.isContentVisible} renderAttack=${message.flags[MODULE_SHORT].renderAttack} renderDamage=${message.flags[MODULE_SHORT].renderDamage} d20Rolls=${message.rolls.filter((r) => r instanceof CONFIG.Dice.D20Roll).length} damageRolls=${message.rolls.filter((r) => r instanceof CONFIG.Dice.DamageRoll).length}`
            );
            if (!message.isContentVisible) {
                LogUtility.log(`[RM DEBUG] _injectContent(ACTIVITY) EXIT: content not visible to this user.`);
                return;
            }

            // dnd5e 6.0 replaced the activity card's ".card-buttons" container with a
            // ".icon-row" holding a <ul> of action buttons (rollAttack/rollDamage/etc, each
            // with a [data-action] attribute) — the OTHER .icon-row on the card (item property
            // pills) has no [data-action] elements, so .has("[data-action]") disambiguates them.
            // Falling back to the old selector keeps this working if dnd5e ever reverts/varies.
            // Scoped to the card body: the per-target save-summary rows (".card-summary", rendered
            // outside ".chat-card") also contain [data-action] buttons and must not be treated as
            // an insertion anchor or have their save rolls stripped.
            const legacyActions = html.find(".card-buttons");
            let actions = legacyActions.length ? legacyActions : html.find(".chat-card > .icon-row").has("[data-action]");
            LogUtility.log(
                `[RM DEBUG] _injectContent(ACTIVITY): legacyActions(.card-buttons)=${legacyActions.length} resolvedActions(.icon-row[data-action])=${actions.length}`
            );

            // The action-button row is the insertion anchor for the roll rows — but dnd5e only
            // renders those buttons for users who can use the item (GM / owner). For everyone
            // else there is no row at all, so anchor a placeholder at the end of the card instead;
            // it's removed once the rows are in place.
            let placeholderAnchor = null;
            if (actions.length === 0) {
                const card = html.find(".chat-card").first();
                placeholderAnchor = $('<span class="rm-insert-anchor" hidden></span>');
                (card.length ? card : html).append(placeholderAnchor);
                actions = placeholderAnchor;
                LogUtility.log(`[RM DEBUG] _injectContent(ACTIVITY): no action-button row for this user (${game.user?.name}); using end-of-card placeholder anchor.`);
            }

            // Remove any redundant dice roll elements that were added forcefully by dnd5e system
            // (and the breakdown popovers that pair with them, which would otherwise be orphaned) —
            // but leave the save-summary rows' own rolls alone.
            html.find(".dice-roll, .roll-breakdown[popover]")
                .filter((_, el) => !el.closest(".card-summary"))
                .remove();

            if (message.flags[MODULE_SHORT].renderAttack || message.flags[MODULE_SHORT].renderAttack === false) {
                actions.find(`[data-action=rollAttack]`).remove();
                await _injectAttackRoll(message, actions);

                // Moved to sit right after the attack row rather than inside it — the icon-row
                // it lives in is a tight single-line flex row, not a container for a paragraph.
                const attackSection = html.find(".rm-section-attack");
                if (attackSection.length) {
                    html.find(".supplement").insertAfter(attackSection).removeClass("supplement").addClass("rm-supplement");
                }
            }

            // Save row (DC box + roll button) sits above the damage row.
            await _injectSaveRow(message, actions);

            if (message.flags[MODULE_SHORT].manualDamage || message.flags[MODULE_SHORT].renderDamage) {
                actions.find(`[data-action=rollDamage]`).remove();
                actions.find(`[data-action=rollHealing]`).remove();
            }

            if (message.flags[MODULE_SHORT].manualDamage) {
                await _injectDamageButton(message, actions);
            }

            if (message.flags[MODULE_SHORT].renderDamage) {
                await _injectDamageRoll(message, actions);
            }

            if (message.flags[MODULE_SHORT].renderFormula) {
                actions.find(`[data-action=rollFormula]`).remove();
                await _injectFormulaRoll(message, actions);
            }

            // Remove redundant system-generated chat-card shells BEFORE injecting embedded saves,
            // because the save wrapper also carries .dnd5e2.chat-card and would be removed otherwise.
            html.find(".dnd5e2.chat-card").not(".activation-card").remove();

            {
                const embeddedSaves = message.flags[MODULE_SHORT].embeddedSaves;
                if (embeddedSaves && Object.keys(embeddedSaves).length > 0) {
                    await _injectEmbeddedSave(message, html);
                }
            }

            _injectDamageTray(message, html);
            _injectSummaryRows(message, html);
            _injectSummaryLabel(message, html);
            _relabelTrayButtons(message, html);

            // Drop the actions row once roll-model has consumed its Attack/Damage/Formula buttons —
            // otherwise a bare circle-play icon is left behind with nothing next to it.
            if (actions.length && actions.find("button, [data-action]").length === 0) {
                actions.remove();
            }
            placeholderAnchor?.remove();

            // The item property tags row (spell level/school, concentration, components, action
            // type, range…) is kept as dnd5e renders it. Attack activities get the attack's own
            // labels ("Ranged Spell Attack", "Melee Attack · Melee Weapon · Two-Handed"…) added to it —
            // vanilla shows those on the separate attack card, which roll-model merges away.
            _appendAttackLabelTags(message, html, actions);

            _wireRollPopovers(html);
            break;
        default:
            break;
    }

    _setupCardListeners(message, html);
}

// dnd5e 6.0 renders every roll on its typed cards (attack/damage/check/save) through this compact
// template: a "button.dice-roll" (the wide box, with the total in a small centred bordered span
// flanked by the gold gradient lines, and the kept d20 as a badge on the right) followed by a
// sibling "div.roll-breakdown[popover]" that opens as a floating dropdown anchored to the button.
// Rendering roll-model's rolls through the same template — instead of the legacy
// roll.toMessage() → ChatMessage#renderHTML path, which still yields the old "div.dice-roll"
// with an inline-expanding tooltip — is what makes the rows match the native card exactly.
const COMPACT_ROLL_TEMPLATE = "systems/dnd5e/templates/chat/parts/roll-compact.hbs";
const DAMAGE_BREAKDOWN_TEMPLATE = "systems/dnd5e/templates/chat/parts/damage-breakdown.hbs";

/**
 * Prepend an annotated formula line into a compact roll's breakdown popover (formula rolls only —
 * attack/damage get the itemised breakdown below instead).
 * @param {JQuery} rollHTML  The button + popover pair.
 * @param {string} formula   The annotated formula text.
 */
function _prependBreakdownFormula(rollHTML, formula) {
    if (!formula) return;
    const tooltip = rollHTML.filter(".roll-breakdown").find(".dice-tooltip");
    if (!tooltip.length) return;
    tooltip.prepend($('<div class="dice-formula"></div>').text(formula));
}

/* Readable names for the short source keys roll-model captures for each bonus term. Anything not
   listed (active-effect names, item names) is shown as-is. */
const BONUS_SOURCE_NAMES = {
    mod: "Ability modifier",
    prof: "Proficiency",
    weaponBonus: "Weapon bonus",
    GWM: "Great Weapon Master",
    rage: "Rage",
    potentSpellcasting: "Potent Spellcasting",
    lunarTransformation: "Lunar Transformation",
    actorBonus: "Bonus",
    "item.damageBonus": "Item bonus",
    modShillelagh: "Shillelagh",
};

function _bonusSourceName(label) {
    if (!label) return "Bonus";
    if (BONUS_SOURCE_NAMES[label]) return BONUS_SOURCE_NAMES[label];
    if (/^system\.bonuses\./.test(label)) return "Bonus";
    return String(label);
}

function _signed(value) {
    const n = Number(value);
    return `${n >= 0 ? "+" : "−"}${Math.abs(n)}`;
}

function _breakdownRow(label, value, { dice, cls, badge } = {}) {
    const row = $(`<div class="rm-bd-row${cls ? ` ${cls}` : ""}"></div>`);
    if (label) row.append($('<span class="rm-bd-label"></span>').text(label));
    if (badge) row.append(badge);
    if (dice) row.append(dice);
    row.append($('<span class="rm-bd-value"></span>').text(value));
    return row;
}

/** Damage/healing type badge: dnd5e's own type icon + name, tinted with the type's colour. */
function _damageTypeBadge(type) {
    const config = CONFIG.DND5E.damageTypes[type] ?? CONFIG.DND5E.healingTypes[type];
    if (!config) return null;
    const badge = $('<span class="rm-bd-type"></span>');
    if (config.icon) badge.append($(`<dnd5e-icon src="${config.icon}"></dnd5e-icon>`));
    badge.append($("<span></span>").text(CoreUtility.localize(config.label)));
    return badge;
}

function _breakdownDice(results, { fumble, crit } = {}) {
    const wrap = $('<span class="rm-bd-dice"></span>');
    for (const r of results) {
        const die = $('<span class="rm-bd-die"></span>').text(r.result);
        if (r.discarded || r.active === false) die.addClass("discarded");
        else if (crit !== undefined && r.result >= crit) die.addClass("crit");
        else if (fumble !== undefined && r.result <= fumble) die.addClass("fumble");
        wrap.append(die);
    }
    return wrap;
}

/** Itemised breakdown for a D20Roll (attack): dice line, one line per bonus source, total. */
function _buildAttackBreakdown(roll, { hideConstants = false } = {}) {
    const box = $('<div class="rm-breakdown"></div>');
    const d20 = roll.d20;

    if (d20) {
        const mode = roll.hasAdvantage
            ? ` · ${CoreUtility.localize("DND5E.Advantage")}`
            : roll.hasDisadvantage
              ? ` · ${CoreUtility.localize("DND5E.Disadvantage")}`
              : "";
        box.append(
            _breakdownRow(`d20${mode}`, d20.total, {
                dice: _breakdownDice(d20.results, { crit: d20.options?.criticalSuccess, fumble: d20.options?.criticalFailure }),
                cls: "rm-bd-diceline",
            }),
        );
    }

    if (!hideConstants) {
        for (const { value, label } of RollUtility.buildLabeledBonuses(roll) ?? []) {
            box.append(_breakdownRow(_bonusSourceName(label), _signed(value)));
        }
        box.append(_breakdownRow(CoreUtility.localize("DND5E.PropertyTotal"), roll.total, { cls: "rm-bd-total" }));
    }

    return box;
}

/** Itemised breakdown for one or more DamageRolls: dice line per damage part, bonus lines, totals. */
function _buildDamageBreakdown(rolls) {
    const box = $('<div class="rm-breakdown"></div>');
    const multiple = rolls.length > 1;

    for (const roll of rolls) {
        const type = roll.options?.type;
        const typeLabel = CONFIG.DND5E.damageTypes[type]?.label ?? CONFIG.DND5E.healingTypes[type]?.label ?? "";
        const segments = RollUtility.buildLabeledDamageSegments(roll) ?? [];

        // dnd5e appends the activity's flat "extra critical damage" as an unlabeled numeric term.
        const critBonus = roll.isCritical ? Number(roll.options?.critical?.bonusDamage) : NaN;
        let critBonusShown = false;

        for (const seg of segments) {
            if (seg.isDie) {
                box.append(
                    _breakdownRow(seg.expression, seg.term.total, {
                        badge: _damageTypeBadge(type),
                        dice: _breakdownDice(seg.term.results),
                        cls: "rm-bd-diceline",
                    }),
                );
            } else if (!seg.label && !critBonusShown && Number.isFinite(critBonus) && seg.value === critBonus) {
                critBonusShown = true;
                box.append(_breakdownRow(CoreUtility.localize("DND5E.ItemCritExtraDamage"), _signed(seg.value)));
            } else {
                box.append(_breakdownRow(_bonusSourceName(seg.label), _signed(seg.value)));
            }
        }

        if (multiple) {
            const badge = _damageTypeBadge(type);
            box.append(_breakdownRow(badge ? null : typeLabel || CoreUtility.localize("DND5E.PropertyTotal"), roll.total, { badge, cls: "rm-bd-subtotal" }));
        }
    }

    const total = rolls.reduce((sum, r) => sum + Math.max(0, r.total), 0);
    box.append(_breakdownRow(CoreUtility.localize("DND5E.PropertyTotal"), total, { cls: "rm-bd-total" }));
    return box;
}

/**
 * Add dnd5e's damage-application tray to roll-model's combined activity card. dnd5e 6.0 only
 * renders the tray on its own "damage"-type cards (DamageMessageData#showTray); a "usage" card
 * holding the damage rolls — which is what roll-model produces — gets none. The 6.0 element is
 * self-sourcing (on connect it reads the DamageRolls from the message it sits in), so an empty
 * element appended to the message content is all it needs.
 * @param {ChatMessage} message
 * @param {JQuery} html  The ".message-content" element.
 */
function _injectDamageTray(message, html) {
    if (!message.isContentVisible) return;
    if (!(game.user.isGM || dnd5e?.settings?.allowPlayerDamageTray)) return;
    if (!message.rolls.some((r) => r instanceof CONFIG.Dice.DamageRoll)) return;
    if (html.find("damage-application").length) return;

    const tray = document.createElement("damage-application");
    tray.classList.add("dnd5e2");

    // Mirror ChatMessage5e#_collapseTrays, which has already run for this card before we add ours.
    let open;
    switch (game.settings.get("dnd5e", "autoCollapseChatTrays")) {
        case "always":
            open = false;
            break;
        case "older":
            open = message.timestamp >= Date.now() - 5 * 60 * 1000;
            break;
        default:
            open = true;
    }
    tray.toggleAttribute("open", open);

    _applySaveMultipliers(tray, message);

    html.append(tray);
    LogUtility.log(`[RM DEBUG] _injectDamageTray messageId=${message.id} user=${game.user?.name} open=${open}`);

    // dnd5e's chat log flags a tray's <recorded-targets> "visible" from an IntersectionObserver on
    // the message <li>, and the target list is only (re)built while that flag is set. The observer
    // fires when the card enters the viewport — which, on a page reload, is before this tray has
    // been appended — so the tray would sit at "No Targets" and ignore token selection until the
    // card scrolled out and back in. Once connected, set the flag ourselves if the card is on screen.
    requestAnimationFrame(() => _syncTrayVisibility(message, tray, 0));
}

function _syncTrayVisibility(message, tray, attempt) {
    const targets = tray.querySelector("recorded-targets");
    if (!targets) {
        // connectedCallback hasn't run yet (card not in the log) — try a few more frames.
        if (attempt < 5) setTimeout(() => _syncTrayVisibility(message, tray, attempt + 1), 100);
        else LogUtility.log(`[RM DEBUG] _syncTrayVisibility messageId=${message.id}: no <recorded-targets> after ${attempt} attempts`);
        return;
    }
    const li = tray.closest(".chat-message");
    const scroll = li?.closest(".chat-scroll");
    if (!li || !scroll) return;
    const a = li.getBoundingClientRect();
    const b = scroll.getBoundingClientRect();
    const onScreen = a.bottom > b.top && a.top < b.bottom;
    LogUtility.log(`[RM DEBUG] _syncTrayVisibility messageId=${message.id} attempt=${attempt} wasVisible=${targets.visible} onScreen=${onScreen} suspended=${targets.suspended}`);
    if (onScreen && !targets.visible) targets.visible = true;
}

/**
 * Half/no damage on a successful save, as dnd5e's own damage card does. Its tray derives that from
 * "system.onSave" + "system.origin.system.outcomes", which only exist on a damage-type message; on
 * the combined usage card the outcomes live on the message itself and the rule on the activity.
 * The tray keeps the save multiplier as a *fallback* (an explicit per-target multiplier or a global
 * multiplier click overrides it), so mirror that by wrapping getMergedOptions rather than seeding
 * per-target options.
 * @param {HTMLElement} tray      The damage-application element (not yet connected).
 * @param {ChatMessage} message   The combined usage message.
 */
function _applySaveMultipliers(tray, message) {
    const activity = message.getAssociatedActivity?.();
    const onSave = activity?.damage?.onSave;
    if (activity?.type !== "save" || !onSave || onSave === "full") return;

    const saveMultiplier = onSave === "none" ? 0 : 0.5;
    let dirty = false;
    tray.addEventListener("click", (e) => { if (e.target.closest(".multiplier-button")) dirty = true; }, true);

    const original = tray.getMergedOptions.bind(tray);
    tray.getMergedOptions = (uuid) => {
        const merged = original(uuid);
        const explicit = tray.getTargetOptions(uuid).multiplier;
        if (explicit === undefined && !dirty && message.system?.outcomes?.get(uuid) === "success") {
            merged.multiplier = saveMultiplier;
        }
        return merged;
    };
    LogUtility.log(`[RM DEBUG] _applySaveMultipliers messageId=${message.id} onSave=${onSave} outcomes=${JSON.stringify([...(message.system?.outcomes ?? [])])}`);
}

/**
 * Enhance each per-target save-summary row of a usage card:
 *  - result and applied-damage sit in fixed-width columns so rows line up;
 *  - the row's breakdown popover is rebuilt in the attack/damage style (both dice for adv/dis,
 *    one line per bonus source, total) plus adv/dis toggles for users who may reroll it;
 *  - clicking anywhere on the row opens that popover (not just the result).
 * @param {ChatMessage} message  The usage (origin) message.
 * @param {JQuery} html          The ".message-content" element.
 */
function _injectSummaryRows(message, html) {
    const applied = message.getFlag(MODULE_NAME, "appliedTo");
    const entries = (applied ? (Array.isArray(applied) ? applied : [applied]) : []).map((e) =>
        typeof e === "string" ? { name: e, damage: null } : e,
    );
    const totalDamage = message.rolls.filter((r) => r instanceof CONFIG.Dice.DamageRoll).reduce((sum, r) => sum + (r.total ?? 0), 0);

    html.find(".card-summary[data-message-id]").each((_, el) => {
        const saveMsg = game.messages.get(el.dataset.messageId);
        const roll = saveMsg?.rolls?.find((r) => r instanceof CONFIG.Dice.D20Roll);
        const row = el.querySelector(".save-summary");
        if (!saveMsg || !roll || !row) return;
        el.classList.add("rm-summary");

        // Applied damage column (always present so rows stay aligned; empty when nothing applied yet).
        const uuid = el.dataset.targetUuid;
        const name = uuid ? fromUuidSync(uuid)?.name : null;
        const entry = entries.find((e) => (e.uuid && uuid ? e.uuid === uuid : e.name === name));
        row.querySelector(".rm-summary-damage")?.remove();
        const dmg = document.createElement("span");
        dmg.className = "rm-summary-damage";
        if (entry && entry.damage != null) {
            let cat = "rm-ack-full";
            if (entry.isTemp) cat = "rm-ack-temp";
            else if (entry.damage > 0) cat = "rm-ack-healing";
            else if (entry.damage === 0) cat = "rm-ack-zero";
            else if (totalDamage > 0 && Math.abs(entry.damage) > totalDamage) cat = "rm-ack-vulnerable";
            else if (totalDamage > 0 && Math.abs(entry.damage) < totalDamage) cat = "rm-ack-reduced";
            dmg.classList.add("rm-ack-damage", cat);
            dmg.textContent = entry.damage > 0 ? `+${entry.damage}` : String(entry.damage);
        }
        row.append(dmg);

        // Base d20(s) column, before the result: one chip normally, both dice for adv/dis with the
        // discarded one dimmed (dnd5e hides its own .d20die badge on summary rows).
        row.querySelector('.rm-summary-dice')?.remove();
        const diceEl = document.createElement('span');
        diceEl.className = 'rm-summary-dice';
        for (const r of roll.d20?.results ?? []) {
            const chip = document.createElement('span');
            chip.className = 'rm-bd-die';
            if (r.discarded || r.active === false) chip.classList.add('discarded');
            else if (roll.d20.options.criticalSuccess != null && r.result >= roll.d20.options.criticalSuccess) chip.classList.add('crit');
            else if (roll.d20.options.criticalFailure != null && r.result <= roll.d20.options.criticalFailure) chip.classList.add('fumble');
            chip.textContent = r.result;
            diceEl.append(chip);
        }
        const resultBtn = row.querySelector('button.dice-roll');
        if (resultBtn) resultBtn.before(diceEl);

        // Popover: attack-style breakdown + adv/dis toggles.
        const popover = el.querySelector(".roll-breakdown[popover]");
        if (popover) {
            if (roll.d20) {
                roll.d20.options.criticalSuccess ??= roll.options.criticalSuccess;
                roll.d20.options.criticalFailure ??= roll.options.criticalFailure;
            }
            const box = _buildAttackBreakdown(roll);

            if (saveMsg.isOwner) {
                const btn = (state, icon, title, active) =>
                    $(`<button type="button" class="rm-retro${active ? " active" : ""}" data-state="${state}" aria-pressed="${!!active}" title="${title}"><i class="fa-solid ${icon}" inert></i></button>`);
                const actions = $('<div class="rm-bd-row rm-bd-actions"></div>')
                    .append($('<span class="rm-bd-label"></span>').text("Reroll"))
                    .append(
                        $('<div class="rm-roll-actions"></div>').append(
                            btn(ROLL_STATE.DIS, "fa-chevrons-down", CoreUtility.localize("rm.chat.buttons.rollDisadvantage"), roll.hasDisadvantage),
                            btn(ROLL_STATE.ADV, "fa-chevrons-up", CoreUtility.localize("rm.chat.buttons.rollAdvantage"), roll.hasAdvantage),
                        ),
                    );
                actions.find("button").on("click", async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    await _processRetroSaveSummaryEvent(message, saveMsg, event.currentTarget.dataset.state);
                });
                box.append(actions);
            }

            popover.replaceChildren(box[0]);
        }

        // Whole-row click opens the popover (buttons/links keep their own behaviour).
        if (popover && !el.dataset.rmRowClick) {
            el.dataset.rmRowClick = "1";
            el.addEventListener("click", (event) => {
                if (event.target.closest("button, a, [data-action], .roll-breakdown")) return;
                try {
                    popover.togglePopover();
                } catch (e) {
                    LogUtility.log(`[RM DEBUG] summary popover toggle failed: ${e?.message}`);
                }
            });
        }
    });
}

/**
 * Titled separator above the per-target save rows ("— 🛡 RESULTS —"), in the same style as
 * dnd5e's Effects/Apply tray labels — the rows otherwise start with a bare dashed line.
 * @param {ChatMessage} message  The usage message.
 * @param {JQuery} html          The ".message-content" element.
 */
function _injectSummaryLabel(message, html) {
    const first = html.find(".card-summary").first();
    if (!first.length || html.find(".rm-summary-label").length) return;
    const label = $(
        `<label class="roboto-upper rm-summary-label"><i class="fa-solid fa-shield-heart" inert></i><span>Results</span></label>`,
    );
    first.before(label);
    LogUtility.log(`[RM DEBUG] _injectSummaryLabel messageId=${message.id} rows=${html.find(".card-summary").length}`);
}

/**
 * "Apply" → "Apply Effect" / "Apply Damage" on the trays' buttons. Both trays are custom elements
 * that build their contents in connectedCallback, i.e. only once the message is in the chat log —
 * so relabel a frame later (same timing as ack.js _markApplyButton), with one retry.
 * @param {ChatMessage} message  The usage message.
 * @param {JQuery} html          The ".message-content" element.
 */
function _relabelTrayButtons(message, html) {
    const root = html[0] ?? html;
    const relabel = (attempt) => {
        const effectSpan = root.querySelector("effect-application .apply-button > span");
        const damageSpan = root.querySelector("damage-application .apply-button > span");
        if (effectSpan) effectSpan.textContent = "Apply Effect";
        if (damageSpan) damageSpan.textContent = "Apply Damage";
        const hasEffectTray = !!root.querySelector("effect-application");
        const hasDamageTray = !!root.querySelector("damage-application");
        const pending = (hasEffectTray && !effectSpan) || (hasDamageTray && !damageSpan);
        LogUtility.log(`[RM DEBUG] _relabelTrayButtons messageId=${message.id} attempt=${attempt} effect=${!!effectSpan} damage=${!!damageSpan} pending=${pending}`);
        if (pending && attempt < 3) setTimeout(() => relabel(attempt + 1), 100);
    };
    requestAnimationFrame(() => relabel(0));
}

async function _processRetroSaveSummaryEvent(origin, saveMsg, state) {
    const roll = saveMsg.rolls.find((r) => r instanceof CONFIG.Dice.D20Roll);
    if (!roll) return;
    const currentState = roll.hasAdvantage ? ROLL_STATE.ADV : roll.hasDisadvantage ? ROLL_STATE.DIS : null;

    if (currentState === state) {
        RollUtility.downgradeRoll(roll);
    } else {
        const confirmed = await DialogUtility.getConfirmDialog(
            CoreUtility.localize(`${MODULE_SHORT}.chat.prompts.retroAdv`, {
                target: state === ROLL_STATE.ADV ? CoreUtility.localize("DND5E.Advantage") : CoreUtility.localize("DND5E.Disadvantage"),
            }),
            { width: 100, left: window.innerWidth - 510 },
        );
        if (!confirmed) return;
        await RollUtility.upgradeRoll(roll, state);
    }

    await saveMsg.update({ rolls: saveMsg.rolls });
    // dnd5e only refreshes the origin card (and its cached outcomes) when the descendent's
    // "system" changes; a rolls-only update needs the same refresh done by hand.
    await origin.system?.onDescendentRefresh?.(saveMsg);
    ui.chat?.updateMessage(origin);
    CoreUtility.playRollSound();
}

/** Replace a compact roll popover's native content with an itemised breakdown. */
function _setBreakdown(rollHTML, content) {
    const popover = rollHTML.filter(".roll-breakdown");
    if (!popover.length) return;
    popover.empty().append(content);
}

/**
 * dnd5e wires each breakdown popover to the button before it in ChatMessageDataModel#_onRender —
 * but that runs before the dnd5e.renderChatMessage hook, so anything roll-model injects afterwards
 * has to do the same wiring itself. The popover's anchor positioning (chat.less: position-anchor
 * auto) keys off this same invoker relationship.
 * @param {JQuery|HTMLElement} root
 */
function _wireRollPopovers(root) {
    const el = root instanceof HTMLElement ? root : root?.[0];
    if (!el) return;
    for (const popover of el.querySelectorAll(".roll-breakdown[popover]")) {
        const invoker = popover.previousElementSibling;
        if (invoker?.tagName === "BUTTON") invoker.popoverTargetElement = popover;
    }
}

/**
 * Build the always-visible retro-action button group that sits to the right of a roll row's box:
 * adv/dis rerolls for the attack row, CRIT/MAX for the damage row. Replaces the old hover overlay
 * that was layered on top of the roll box itself.
 * @param {ChatMessage} message
 * @param {"attack"|"damage"} kind
 * @returns {JQuery|null}  Null when the current user may not modify this message's rolls.
 */
function _buildRollActions(message, kind) {
    const actor = message.getAssociatedActor?.();
    const hasPermission = game.user.isGM || message.isAuthor || actor?.isOwner;
    if (!hasPermission) return null;

    const group = $(`<div class="rm-roll-actions" data-key="${kind}"></div>`);
    const btn = (attrs, inner, active) =>
        $(`<button type="button" class="rm-retro${active ? " active" : ""}" data-action="rm-retro" aria-pressed="${!!active}" ${attrs}>${inner}</button>`);
    const flags = message.flags[MODULE_SHORT] ?? {};

    if (kind === ROLL_TYPE.ATTACK) {
        const roll = message.rolls.find((r) => r instanceof CONFIG.Dice.D20Roll && !r.options?.embeddedSave);
        group.append(
            btn(`data-state="${ROLL_STATE.DIS}" title="${CoreUtility.localize("rm.chat.buttons.rollDisadvantage")}"`, '<i class="fa-solid fa-chevrons-down" inert></i>', roll?.hasDisadvantage),
            btn(`data-state="${ROLL_STATE.ADV}" title="${CoreUtility.localize("rm.chat.buttons.rollAdvantage")}"`, '<i class="fa-solid fa-chevrons-up" inert></i>', roll?.hasAdvantage),
        );
    } else {
        // Flat damage (e.g. a weapon mastery's "[[/damage 7]]" enricher) has no dice to double or
        // maximize — show the buttons for consistency but leave them inert.
        const hasDice = message.rolls.some(
            (r) => r instanceof CONFIG.Dice.DamageRoll && r.terms.some((t) => t instanceof foundry.dice.terms.Die),
        );
        const disabled = hasDice ? "" : " disabled";
        group.append(
            btn(`data-type="crit" title="${CoreUtility.localize("rm.chat.buttons.rollCrit")}"${disabled}`, "CRIT", flags.isCritical),
            btn(`data-type="max" title="${CoreUtility.localize("rm.chat.buttons.rollMax")}"${disabled}`, "MAX", flags.isMaximized),
        );
    }

    return group;
}

async function _injectAttackRoll(message, html) {
    const roll = message.rolls.find((r) => r instanceof CONFIG.Dice.D20Roll && !r.options?.embeddedSave);

    LogUtility.log(`[RM DEBUG] _injectAttackRoll messageId=${message.id} user=${game.user?.name} rollFound=${!!roll} anchorFound=${html?.length ?? 0}`);
    if (!roll) return;

    RollUtility.resetRollGetters(roll);

    roll.options.displayChallenge = message.flags[MODULE_SHORT].displayAttackResult;

    // Rolls stored before the ensureMultiRoll fix lost the die-level crit thresholds that
    // D20Die#isCriticalSuccess reads; restore them from the roll options at render time.
    if (roll.d20) {
        roll.d20.options.criticalSuccess ??= roll.options.criticalSuccess;
        roll.d20.options.criticalFailure ??= roll.options.criticalFailure;
    }

    const rollHTML = $(
        await roll.render({
            template: COMPACT_ROLL_TEMPLATE,
            canCrit: true,
            displayResult: !!message.flags[MODULE_SHORT].displayAttackResult,
            forceSuccess: false,
            isPrivate: false,
            message,
        }),
    ).filter("button, .roll-breakdown");

    _setBreakdown(rollHTML, _buildAttackBreakdown(roll, { hideConstants: !!roll.options.hideFinalAttack }));

    // Advantage/disadvantage: dnd5e's compact template only badges the kept d20. Add a dimmed
    // badge for each discarded die, stacked to the left of the kept one.
    const keptBadge = rollHTML.filter("button").find(".d20die");
    const discarded = (roll.d20?.results ?? []).filter((r) => r.discarded || r.active === false);
    if (keptBadge.length && discarded.length) {
        discarded.forEach((result, i) => {
            const badge = $(
                `<span class="d20die rm-d20-discarded" style="inset-inline-end: ${8 + 22 * (i + 1)}px">` +
                    `<i class="fa-fw fa-solid fa-hexagon fa-rotate-90" inert></i><span class="roll">${result.result}</span></span>`,
            );
            keptBadge.before(badge);
        });
    }

    if (roll.options.hideFinalAttack) {
        rollHTML.filter("button").find(".total").text(CoreUtility.localize(`${MODULE_SHORT}.chat.hide`));
    }

    const ammo = message.getAssociatedActor()?.items?.get(message.flags[MODULE_SHORT].ammunition)?.name;

    // Same row shape as dnd5e's own card-rolls.hbs: "<section class='icon-row'><i/>{{roll}}</section>".
    const sectionHTML = $(
        await RenderUtility.render(TEMPLATE.SECTION, {
            section: `rm-section-${ROLL_TYPE.ATTACK}`,
            title: CoreUtility.localize("DND5E.Attack"),
            icon: '<dnd5e-icon src="systems/dnd5e/icons/svg/trait-weapon-proficiencies.svg" aria-label="Attack"></dnd5e-icon>',
            subtitle: ammo ? `${CoreUtility.localize("DND5E.CONSUMABLE.Type.Ammunition.Label")} - ${ammo}` : undefined,
        }),
    );

    sectionHTML.append(rollHTML);
    sectionHTML.append(_buildRollActions(message, ROLL_TYPE.ATTACK));
    sectionHTML.insertBefore(html);
    LogUtility.log(`[RM DEBUG] _injectAttackRoll DONE messageId=${message.id} renderedRollNodes=${rollHTML.length} inDom=${sectionHTML[0]?.isConnected}`);
}

/**
 * Replace dnd5e's small "Saving Throw" icon button (in the actions row) with a labelled row in the
 * attack/damage style: "Save" label plus one full-width roll button reading e.g.
 * "DC 20 Wisdom Saving Throw" (dnd5e's own resolved button label, so the DC is omitted for users
 * who may not see the challenge). The native data-action/data-index/data-dc/data-ability attributes
 * are carried over so dnd5e's delegated click handler still performs the roll. One row per save
 * button (an activity can call for more than one ability).
 * @param {ChatMessage} message  The usage message.
 * @param {JQuery} html          The actions row (insertion anchor).
 */
async function _injectSaveRow(message, html) {
    const buttons = html.find('[data-action="rollSave"]');
    LogUtility.log(`[RM DEBUG] _injectSaveRow messageId=${message.id} user=${game.user?.name} saveButtons=${buttons.length}`);
    if (!buttons.length) return;

    let prepared = [];
    try {
        prepared = message.system?._prepareButtons?.() ?? [];
    } catch (e) {
        LogUtility.log(`[RM DEBUG] _injectSaveRow: _prepareButtons failed: ${e?.message}`);
    }

    for (const btn of buttons.toArray()) {
        const index = Number(btn.dataset.index);
        const ability = CONFIG.DND5E.abilities[btn.dataset.ability]?.label ?? "";
        const label =
            prepared[index]?.label ??
            (btn.dataset.dc ? CoreUtility.localize("DND5E.SavingThrowDC", { ability, dc: btn.dataset.dc }) : CoreUtility.localize("DND5E.SavePromptTitle", { ability }));

        const sectionHTML = $(
            await RenderUtility.render(TEMPLATE.SECTION, {
                section: "rm-section-save",
                title: "Save",
                subtitle: label,
                icon: '<i class="fa-fw fa-solid fa-shield-heart" aria-label="Save"></i>',
            }),
        );

        const roll = $('<button type="button" class="dice-roll rm-save-roll"></button>');
        for (const key of ["action", "index", "dc", "ability"]) {
            if (btn.dataset[key] !== undefined) roll[0].dataset[key] = btn.dataset[key];
        }
        roll.append(
            $('<span class="result"></span>').append(
                $('<span class="rm-save-label"></span>').append('<i class="fa-solid fa-shield-heart" inert></i> ', document.createTextNode(label)),
            ),
        );

        // Drop the native icon button (and its now-empty <li>).
        const li = btn.closest("li");
        btn.remove();
        li?.remove();

        // No "Save" label — the button text says it all; the button widens into the label column.
        sectionHTML.find(".rm-row-label").remove();
        sectionHTML.append(roll);
        sectionHTML.insertBefore(html);
        LogUtility.log(`[RM DEBUG] _injectSaveRow row added index=${index} label="${label}"`);
    }
}

async function _injectFormulaRoll(message, html) {
    const roll = message.rolls.find((r) => r instanceof CONFIG.Dice.BasicRoll);

    if (!roll) return;

    const rollHTML = $(
        await roll.render({
            template: COMPACT_ROLL_TEMPLATE,
            isPrivate: false,
            message,
        }),
    ).filter("button, .roll-breakdown");

    _prependBreakdownFormula(rollHTML, roll.formula);

    const sectionHTML = $(
        await RenderUtility.render(TEMPLATE.SECTION, {
            section: `rm-section-${ROLL_TYPE.FORMULA}`,
            title: message.flags[MODULE_SHORT].formulaName ?? CoreUtility.localize("DND5E.OtherFormula"),
            icon: '<i class="fa-fw fa-solid fa-dice" aria-label="Formula"></i>',
        }),
    );

    sectionHTML.append(rollHTML);
    sectionHTML.insertBefore(html);
}

async function _injectDamageRoll(message, html) {
    const rolls = message.rolls.filter((r) => r instanceof CONFIG.Dice.DamageRoll);

    LogUtility.log(`[RM DEBUG] _injectDamageRoll messageId=${message.id} user=${game.user?.name} damageRolls=${rolls.length} anchorFound=${html?.length ?? 0}`);
    if (!rolls || rolls.length === 0) return;

    // The saved damage-type preference is applied when the roll is built (see
    // ChatUtility.applyDamageTypePrefs from dnd5e.preRollDamageV2), so each roll's stored
    // options.type is authoritative here — old cards keep the type they were rolled with.

    // Mirror DamageMessageData#_prepareContext: one compact button showing the summed total,
    // with the per-type parts in the breakdown popover.
    const aggregate = CONFIG.DND5E.aggregateDamageDisplay && typeof dnd5e?.dice?.aggregateDamageRolls === "function";
    const displayRolls = aggregate ? dnd5e.dice.aggregateDamageRolls(rolls) : rolls;
    const parts = displayRolls.map((roll) => {
        const part = roll.aggregateTerms();
        part.config = CONFIG.DND5E.damageTypes[part.type] ?? CONFIG.DND5E.healingTypes[part.type] ?? null;
        part.label = part.config?.labelShort ?? part.config?.label ?? "";
        return part;
    });
    const total = rolls.reduce((sum, roll) => sum + Math.max(0, roll.total), 0);

    const tooltip = await foundry.applications.handlebars.renderTemplate(DAMAGE_BREAKDOWN_TEMPLATE, { parts });
    const rollHTML = $(
        await foundry.applications.handlebars.renderTemplate(COMPACT_ROLL_TEMPLATE, {
            classes: message.flags[MODULE_SHORT].isCritical ? "critical" : "",
            icons: [],
            isPrivate: false,
            total,
            tooltip,
        }),
    ).filter("button, .roll-breakdown");
    rollHTML.filter("button").addClass("rm-damage");

    _setBreakdown(rollHTML, _buildDamageBreakdown(rolls));

    const header = message.flags[MODULE_SHORT].isHealing
        ? {
              section: `rm-section-${ROLL_TYPE.DAMAGE}`,
              title: CoreUtility.localize("DND5E.HEAL.HealingButton"),
              icon: '<dnd5e-icon src="systems/dnd5e/icons/svg/damage/healing.svg" aria-label="Healing"></dnd5e-icon>',
          }
        : {
              section: `rm-section-${ROLL_TYPE.DAMAGE}`,
              title: `${CoreUtility.localize("DND5E.Damage")}${message.flags[MODULE_SHORT].versatile ? " (" + CoreUtility.localize("DND5E.Versatile") + ")" : ""}`,
              icon: '<i class="fa-fw fa-solid fa-burst" aria-label="Damage"></i>',
              subtitle: message.flags[MODULE_SHORT].isCritical ? `${CoreUtility.localize("DND5E.CriticalHit")}!` : undefined,
              critical: message.flags[MODULE_SHORT].isCritical,
          };

    const sectionHTML = $(await RenderUtility.render(TEMPLATE.SECTION, header));
    sectionHTML.append(rollHTML);
    sectionHTML.append(_buildRollActions(message, ROLL_TYPE.DAMAGE));

    // Damage-type pills and the GWM/CR toggle row are separate rows BELOW the icon-row, not
    // nested inside it — dnd5e's icon-row (chat.less) is a tight single-line flex row meant to
    // hold exactly one icon + one roll control, not a second line of content. Nesting extra rows
    // inside it (the pre-6.0 approach) required "flex: 0 0 100%" + "flex-wrap: wrap" hacks that
    // broke when dnd5e stopped setting flex-wrap on its header classes. Keeping them as plain
    // sibling rows sidesteps that whole class of layout bug.
    const extraRows = [];

    // Damage-type pills and the GWM/CR toggles modify the message — only offer them to users who
    // can actually update it (GM, author, or owner of the acting actor); others get a read-only card.
    const actorForPerms = message.getAssociatedActor?.();
    const canModify = game.user.isGM || message.isAuthor || !!actorForPerms?.isOwner;

    const readonlyClass = canModify ? "" : " rm-readonly";

    for (let i = 0; i < rolls.length; i++) {
        const roll = rolls[i];
        if (roll.options.types && roll.options.types.length > 1) {
            const types = roll.options.types.map((t) => ({
                key: t,
                label: CONFIG[MODULE_SHORT]?.combinedDamageTypes?.[t] ?? t,
            }));
            const selectedType = roll.options.type ?? roll.options.types[0];
            const pillsHTML = $(`<div class="rm-type-selector${readonlyClass}"></div>`);
            for (const type of types) {
                const pill = $(
                    `<span class="rm-type-pill ${type.key === selectedType ? "active" : ""}${readonlyClass}" data-type="${type.key}" data-part="${i}">${type.label}</span>`,
                );
                pillsHTML.append(pill);
            }
            extraRows.push(pillsHTML);
        }
    }

    const flags = (message.flags ?? message.data?.flags)?.[MODULE_SHORT] ?? {};
    const showCelestialRevelation = flags.celestialRevelationEligible && flags.renderAttack;

    if (flags.gwmEligible || showCelestialRevelation) {
        const row = $('<div class="rm-gwm-row"></div>');
        const disabled = canModify ? "" : " disabled";

        if (flags.gwmEligible) {
            const gwmActive = flags.gwmActive;
            row.append($(`<label class="rm-gwm-toggle${readonlyClass}"><input type="checkbox" ${gwmActive ? "checked" : ""}${disabled}>GWM</label>`));
        }

        if (showCelestialRevelation) {
            const active = flags.celestialRevelationActive;
            row.append($(`<label class="rm-celestial-revelation${readonlyClass}"><input type="checkbox" ${active ? "checked" : ""}${disabled}>CR</label>`));
        }

        extraRows.push(row);
    }

    sectionHTML.insertBefore(html);
    let anchor = sectionHTML;
    for (const row of extraRows) {
        row.insertAfter(anchor);
        anchor = row;
    }
    LogUtility.log(`[RM DEBUG] _injectDamageRoll DONE messageId=${message.id} renderedRollNodes=${rollHTML.length} extraRows=${extraRows.length} inDom=${sectionHTML[0]?.isConnected}`);

    // Saved damage-type preferences were applied to roll.options.type above; the 6.0 damage tray
    // reads those same roll objects when it connects, so no separate tray sync is needed.
}

async function _injectDamageButton(message, html) {
    const button = message.flags[MODULE_SHORT].isHealing
        ? {
              title: CoreUtility.localize("DND5E.HEAL.HealingButton"),
              icon: '<dnd5e-icon src="systems/dnd5e/icons/svg/damage/healing.svg"></dnd5e-icon>',
          }
        : {
              title: CoreUtility.localize("DND5E.Damage"),
              icon: '<i class="fas fa-burst"></i>',
          };

    const render = await RenderUtility.render(TEMPLATE.BUTTON, {
        action: ROLL_TYPE.DAMAGE,
        ...button,
    });

    html.prepend($(render));
}

/**
 * Standalone check/save card (dnd5e 6.0): rebuild the compact roll button's breakdown popover in
 * the roll-model style and badge the discarded d20(s) on the button, exactly like the activity
 * card's attack row. Owners also get adv/dis reroll toggles at the bottom of the popover.
 * @param {ChatMessage} message
 * @param {JQuery} html     The ".message-content" element.
 * @param {D20Roll} roll    The card's roll.
 * @param {string} type     ROLL_TYPE of the card (for logging).
 */
function _enhanceStandaloneRoll(message, html, roll, type) {
    // Not the labelled action buttons (.rm-save-roll), which share the dice-roll box styling.
    const button = html.find("button.dice-roll").not(".rm-save-roll").first();
    const popover = html.find(".roll-breakdown[popover]").first();
    LogUtility.log(
        `[RM DEBUG] _enhanceStandaloneRoll(${type}) messageId=${message.id} button=${button.length} popover=${popover.length} isD20=${roll instanceof CONFIG.Dice.D20Roll} adv=${roll?.hasAdvantage} dis=${roll?.hasDisadvantage} isOwner=${message.isOwner}`
    );
    if (!button.length || !popover.length || !(roll instanceof CONFIG.Dice.D20Roll)) return;

    if (roll.d20) {
        roll.d20.options.criticalSuccess ??= roll.options.criticalSuccess;
        roll.d20.options.criticalFailure ??= roll.options.criticalFailure;
    }
    const box = _buildAttackBreakdown(roll);

    if (message.isOwner) {
        const btn = (state, icon, title, active) =>
            $(`<button type="button" class="rm-retro${active ? " active" : ""}" data-state="${state}" aria-pressed="${!!active}" title="${title}"><i class="fa-solid ${icon}" inert></i></button>`);
        const actions = $('<div class="rm-bd-row rm-bd-actions"></div>')
            .append($('<span class="rm-bd-label"></span>').text("Reroll"))
            .append(
                $('<div class="rm-roll-actions"></div>').append(
                    btn(ROLL_STATE.DIS, "fa-chevrons-down", CoreUtility.localize("rm.chat.buttons.rollDisadvantage"), roll.hasDisadvantage),
                    btn(ROLL_STATE.ADV, "fa-chevrons-up", CoreUtility.localize("rm.chat.buttons.rollAdvantage"), roll.hasAdvantage),
                ),
            );
        actions.find("button").on("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await _processRetroStandaloneRollEvent(message, roll, event.currentTarget.dataset.state);
        });
        box.append(actions);
    }
    popover[0].replaceChildren(box[0]);

    // Advantage/disadvantage: dnd5e only badges the kept d20 — add a dimmed badge per discarded die.
    const keptBadge = button.find(".d20die");
    const discarded = (roll.d20?.results ?? []).filter((r) => r.discarded || r.active === false);
    if (keptBadge.length && discarded.length) {
        discarded.forEach((result, i) => {
            keptBadge.before(
                $(
                    `<span class="d20die rm-d20-discarded" style="inset-inline-end: ${8 + 22 * (i + 1)}px">` +
                        `<i class="fa-fw fa-solid fa-hexagon fa-rotate-90" inert></i><span class="roll">${result.result}</span></span>`,
                ),
            );
        });
    }
}

/**
 * Add the attack activity's action labels (AttackData#getActionLabel — e.g. "Ranged Spell Attack",
 * or "Melee Attack", "Melee Weapon", "Two-Handed") as pills on the usage card's property tags row.
 * @param {ChatMessage} message
 * @param {JQuery} html     The ".message-content" element.
 * @param {JQuery} actions  The actions row (excluded when looking for the tags row).
 */
function _appendAttackLabelTags(message, html, actions) {
    if (!message.flags[MODULE_SHORT].renderAttack) return;
    const activity = message.getAssociatedActivity?.();
    if (typeof activity?.getActionLabel !== "function") return;

    const attackRoll = message.rolls.find((r) => r instanceof CONFIG.Dice.D20Roll);
    let labels = [];
    try {
        labels = activity.getActionLabel(attackRoll?.options?.attackMode) ?? [];
    } catch (e) {
        LogUtility.log(`[RM DEBUG] _appendAttackLabelTags messageId=${message.id}: getActionLabel failed: ${e?.message}`);
        return;
    }

    const tagsRow = html.find(".chat-card > .icon-row").not(actions).filter((_, el) => $(el).find("ul.pills").length > 0).first();
    LogUtility.log(`[RM DEBUG] _appendAttackLabelTags messageId=${message.id} labels=${JSON.stringify(labels)} tagsRow=${tagsRow.length} attackMode=${attackRoll?.options?.attackMode}`);
    if (!labels.length || !tagsRow.length) return;

    const list = tagsRow.find("ul.pills").first();
    const existing = new Set(list.find(".pill").toArray().map((el) => el.textContent.trim()));
    for (const label of labels) {
        if (existing.has(label)) continue;
        list.append($('<li class="pill transparent rm-attack-tag"></li>').text(label));
    }
}

/**
 * Derive labelled bonus parts for an initiative roll that was built without the roll hooks, from
 * the actor's current initiative configuration (Actor5e#getInitiativeRollConfig: "@mod", "@prof",
 * "@ruleBonus", "@alert", condition reductions, dex tiebreaker). Only for display — the roll's
 * terms are what they are; if the actor's data has changed since, unmatched terms fall back to
 * unlabelled lines.
 */
function _captureInitiativeParts(message, roll) {
    const actor = message.getAssociatedActor?.() ?? ChatUtility.getActorFromMessage(message);
    if (!actor?.getInitiativeRollConfig) {
        LogUtility.log(`[RM DEBUG] _captureInitiativeParts messageId=${message.id}: no actor / getInitiativeRollConfig`);
        return;
    }
    try {
        const cfg = actor.getInitiativeRollConfig({});
        if (!cfg?.parts?.length) return;
        // Same shape captureCheckFormulaParts works on: parts + data, options written in place.
        const rollConfig = { parts: cfg.parts, data: cfg.data, options: {}, ability: cfg.options?.ability, subject: actor };
        RollUtility.captureCheckFormulaParts({ subject: actor, ability: cfg.options?.ability }, rollConfig, 0);
        for (const key of ["bonusParts", "bonusResolved", "bonusLabels", "bonusTermLabels", "bonusData"]) {
            if (rollConfig.options[key] !== undefined) roll.options[key] = rollConfig.options[key];
        }
        LogUtility.log(`[RM DEBUG] _captureInitiativeParts messageId=${message.id} parts=${JSON.stringify(cfg.parts)} labels=${JSON.stringify(rollConfig.options.bonusTermLabels)}`);
    } catch (e) {
        LogUtility.log(`[RM DEBUG] _captureInitiativeParts messageId=${message.id} failed: ${e?.message}`);
    }
}

/**
 * Adv/dis toggle on a standalone check/save card: same three-way logic as the save-summary rows
 * (clicking the active state reverts to a single-die roll). The message's own roll is updated in
 * place; dnd5e re-derives success/failure — and thus the break-concentration offer — on re-render.
 */
async function _processRetroStandaloneRollEvent(message, roll, state) {
    const currentState = roll.hasAdvantage ? ROLL_STATE.ADV : roll.hasDisadvantage ? ROLL_STATE.DIS : null;
    if (currentState === state) {
        RollUtility.downgradeRoll(roll);
    } else {
        const confirmed = await DialogUtility.getConfirmDialog(
            CoreUtility.localize(`${MODULE_SHORT}.chat.prompts.retroAdv`, {
                target: state === ROLL_STATE.ADV ? CoreUtility.localize("DND5E.Advantage") : CoreUtility.localize("DND5E.Disadvantage"),
            }),
            { width: 100, left: window.innerWidth - 510 },
        );
        if (!confirmed) return;
        await RollUtility.upgradeRoll(roll, state);
    }
    // Keep the card's subtitle in step: dnd5e appends " (Advantage)" / " (Disadvantage)" to the
    // flavor when the roll is made (D20Roll#toMessage) and never revisits it.
    const suffixes = [CoreUtility.localize("DND5E.Advantage"), CoreUtility.localize("DND5E.Disadvantage")];
    let flavor = message.flavor ?? "";
    for (const s of suffixes) flavor = flavor.replace(new RegExp(`\\s*\\(${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)\\s*$`), "");
    if (roll.hasAdvantage) flavor += ` (${suffixes[0]})`;
    else if (roll.hasDisadvantage) flavor += ` (${suffixes[1]})`;
    LogUtility.log(`[RM DEBUG] _processRetroStandaloneRollEvent messageId=${message.id} state=${state} newTotal=${roll.total} formula=${roll.formula} flavor="${flavor}"`);
    await message.update({ rolls: message.rolls, flavor });

    // Initiative: the tracker holds its own copy of the result — move the combatant with the reroll.
    if (message.system?.type === "initiative") {
        const spk = message.speaker ?? {};
        const combatant = game.combats?.contents
            .flatMap((c) => c.combatants.contents)
            .find((c) => (spk.token && c.tokenId === spk.token) || (!spk.token && spk.actor && c.actorId === spk.actor));
        LogUtility.log(`[RM DEBUG] _processRetroStandaloneRollEvent initiative: combatant=${combatant?.name ?? "none"} old=${combatant?.initiative} new=${roll.total}`);
        if (combatant) await combatant.update({ initiative: roll.total });
    }

    // A save rolled from a prompt/usage card: refresh that parent so its summary/outcomes follow.
    const origin = message.system?.origin ? game.messages.get(message.system.origin) : null;
    if (origin) {
        await origin.system?.onDescendentRefresh?.(message);
        ui.chat?.updateMessage(origin);
    }
    CoreUtility.playRollSound();
}

/**
 * dnd5e renders "break concentration" (failed concentration saves, owner only, not yet broken) as
 * a bare icon button in the card's actions row. Turn it into a labelled full-width button in the
 * style of the usage card's save button; the native data-action attribute is kept so dnd5e's
 * delegated click handler still performs the break.
 */
function _restyleBreakConcentrationButton(message, html) {
    const native = html.find('[data-action="breakConcentration"]').first();
    const broken = !!message.system?.concentrationBroken;
    LogUtility.log(`[RM DEBUG] _restyleBreakConcentrationButton messageId=${message.id} nativeButton=${native.length} outcome=${message.system?.outcome} broken=${broken} canBreak=${message.system?.canBreakConcentration}`);
    // Nothing offered (success, not the owner, …) and not already broken: leave the card alone.
    if (!native.length && !broken) return;

    // Once broken, dnd5e drops the button and prints "Status: Lost Concentration" instead. Show the
    // button disabled in its place (it reads as "pressed") and drop that status line.
    if (broken) {
        html.find(".supplement").filter((_, el) => el.textContent.includes(CoreUtility.localize("DND5E.CONCENTRATION.Lost"))).remove();
    }

    const label = CoreUtility.localize("DND5E.CONCENTRATION.Action.Break");
    const button = $(
        `<button type="button" class="dice-roll rm-save-roll rm-break-concentration" data-action="breakConcentration"${broken ? " disabled" : ""}>` +
            `<span class="result"><span class="rm-save-label"><i class="fa-solid fa-ban" inert></i> ${label}</span></span>` +
            `</button>`,
    );
    // Same "actions" row icon as vanilla's button row.
    const section = $(
        `<section class="icon-row rm-section-save rm-section-concentration" title="${label}">` +
            `<i class="fa-solid fa-fw fa-circle-play" aria-label="${CoreUtility.localize("DND5E.CHATMESSAGE.Row.Actions")}"></i></section>`,
    ).append(button);

    const row = native.closest(".icon-row");
    if (row.length) row.replaceWith(section);
    else html.find(".chat-card").first().append(section);
}

async function _injectBreakConcentrationButton(message, html) {
    const button = {
        title: CoreUtility.localize("DND5E.ConcentrationBreak"),
        icon: '<i class="fas fa-xmark"></i>',
    };

    const render = await RenderUtility.render(TEMPLATE.BUTTON, {
        action: ROLL_TYPE.CONCENTRATION,
        ...button,
    });

    html.append($(render).addClass("rm-concentration-buttons"));
}

/**
 * Adds all overlay buttons to a chat card.
 * @param {ChatMessage} message The chat message for which content is being injected.
 * @param {JQuery} html The object to add overlay buttons to.
 * @private
 */
async function _injectOverlayButtons(message, html) {
    await _injectOverlayRetroButtons(message, html);

    // Enable Hover Events (to show/hide the elements).
    _onOverlayHoverEnd(html);
    html.hover(_onOverlayHover.bind(this, message, html), _onOverlayHoverEnd.bind(this, html));
}

/**
 * Adds overlay buttons to a chat card for retroactively making a roll into a multi roll or a crit.
 * @param {ChatMessage} message The chat message for which content is being injected.
 * @param {JQuery} html The object to add overlay buttons to.
 * @private
 */
async function _injectOverlayRetroButtons(message, html) {
    const overlayMultiRoll = await RenderUtility.render(TEMPLATE.OVERLAY_MULTIROLL, {});

    // Check/save/skill card path only — activity cards use the always-visible ".rm-roll-actions"
    // button group beside the roll box instead (see _buildRollActions).
    html.find(".rm-multiroll .dice-total").append($(overlayMultiRoll));

    // Handle clicking the multi-roll overlay buttons
    html.find(".rm-overlay-multiroll div").click(async (event) => {
        await _processRetroAdvButtonEvent(message, event);
    });

    const overlayCrit = await RenderUtility.render(TEMPLATE.OVERLAY_CRIT, {});

    html.find(".rm-damage .dice-total").append($(overlayCrit));

    html.find(".rm-overlay-crit div[data-type='crit']").click(async (event) => {
        await _processRetroCritButtonEvent(message, event);
    });

    html.find(".rm-overlay-crit div[data-type='max']").click(async (event) => {
        await _processRetroMaxButtonEvent(message, event);
    });

    // Save-section adv/dis overlays: show only when hovering the specific save section.
    // Permission is per-section: GM always, or the player who owns the saving actor.
    html.find("[data-save-speaker]").each((_, section) => {
        const $section = $(section);
        const speakerName = section.dataset.saveSpeaker;
        const savingActor = game.actors?.find(a => a.name === speakerName);
        const canReroll = game.user.isGM || message?.isAuthor || savingActor?.isOwner;
        $section.hover(
            () => {
                if (!canReroll) return;
                $section.find(".rm-overlay-multiroll").show();
            },
            () => {
                $section.find(".rm-overlay").attr("style", "display: none;");
            }
        );
    });
}

async function _processBreakConcentrationButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    const actor = ChatUtility.getActorFromMessage(message);

    if (actor) {
        const ActiveEffect5e = CONFIG.ActiveEffect.documentClass;
        ActiveEffect5e._manageConcentration(event, actor);
    }
}

async function _processGwmToggleEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    const active = event.currentTarget.checked;

    const rolls = message.rolls.filter((r) => r instanceof CONFIG.Dice.DamageRoll);
    if (!rolls.length) return;

    const roll = rolls.find((r) => r.options?.gwmBonus != null) ?? rolls[0];
    const profBonus = roll.options?.gwmBonus ?? ChatUtility.getActorFromMessage(message)?.system?.attributes?.prof ?? 0;

    roll.options.bonusParts ??= [];
    roll.options.bonusResolved ??= [];
    roll.options.bonusLabels ??= [];
    roll.options.bonusSourceLabels ??= [];

    const gwmLabel = "GWM";
    const gwmPart = "@prof";

    if (active) {
        const opTerm = new foundry.dice.terms.OperatorTerm({ operator: "+" });
        const numTerm = new foundry.dice.terms.NumericTerm({ number: profBonus, options: { gwm: true } });
        opTerm._evaluated = true;
        numTerm._evaluated = true;
        roll.terms.push(opTerm, numTerm);

        roll.options.bonusParts.push(gwmPart);
        roll.options.bonusResolved.push(profBonus);
        roll.options.bonusLabels.push(gwmLabel);
        roll.options.bonusSourceLabels.push(gwmLabel);
    } else {
        const terms = roll.terms;
        // Prefer term explicitly marked as GWM; fall back to last numeric matching profBonus
        let gwmTermIdx = terms.findIndex((t) => t instanceof foundry.dice.terms.NumericTerm && t.options?.gwm);
        if (gwmTermIdx === -1) {
            for (let i = terms.length - 1; i >= 0; i--) {
                if (terms[i] instanceof foundry.dice.terms.NumericTerm && terms[i].number === profBonus) {
                    gwmTermIdx = i;
                    break;
                }
            }
        }
        if (gwmTermIdx !== -1) {
            const start = gwmTermIdx > 0 && terms[gwmTermIdx - 1] instanceof foundry.dice.terms.OperatorTerm ? gwmTermIdx - 1 : gwmTermIdx;
            terms.splice(start, gwmTermIdx - start + 1);
        }

        const idx = roll.options.bonusSourceLabels.lastIndexOf(gwmLabel);
        if (idx !== -1) {
            roll.options.bonusParts.splice(idx, 1);
            roll.options.bonusResolved.splice(idx, 1);
            roll.options.bonusLabels.splice(idx, 1);
            roll.options.bonusSourceLabels.splice(idx, 1);
        }
    }

    RollUtility.resetRollGetters(roll);

    const update = { rolls: message.rolls };
    update[`flags.${MODULE_SHORT}.gwmActive`] = active;

    ChatUtility.updateChatMessage(message, update);
}

async function _processCelestialToggleEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    const active = event.currentTarget.checked;
    const flags = message.flags[MODULE_SHORT];
    const actor = ChatUtility.getActorFromMessage(message);
    if (!actor) return;

    if (active) {
        const profBonus = actor.system?.attributes?.prof ?? 0;
        const damageType = flags.celestialRevelationDamageType ?? "radiant";

        const roll = new CONFIG.Dice.DamageRoll(String(profBonus), {}, { type: damageType, celestialRevelation: true });
        await roll.evaluate();
        roll.options.bonusParts = [String(profBonus)];
        roll.options.bonusResolved = [profBonus];
        roll.options.bonusLabels = ["CR"];
        roll.options.bonusSourceLabels = ["CR"];
        message.rolls.push(roll);
    } else {
        message.rolls = message.rolls.filter((r) => !r.options?.celestialRevelation);
    }

    flags.celestialRevelationActive = active;

    ChatUtility.updateChatMessage(message, {
        flags: message.flags,
        rolls: message.rolls,
    });
}

/**
 * Processes and handles a retroactive advantage/disadvantage button click event.
 * @param {ChatMessage} message The chat message for which an event is being processed.
 * @param {Event} event The originating event of the button click.
 * @private
 */
async function _processRetroAdvButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const action = button.dataset.action;
    const state = button.dataset.state;
    // ".rm-multiroll" on the check/save card path; ".rm-roll-actions" on activity cards.
    const key = $(button).closest("[data-key]")[0]?.dataset.key ?? ROLL_TYPE.ATTACK;

    if (action === "rm-retro") {
        const dialogOptions = {
            width: 100,
            top: event ? event.clientY - 50 : null,
            left: window.innerWidth - 510,
        };

        // Activity cards: the buttons are toggles. Clicking the already-active state reverts to the
        // original normal roll (snapshotted on first upgrade); clicking the other state switches.
        const activityRoll = key === ROLL_TYPE.ABILITY_SAVE ? null : message.rolls.find((r) => r instanceof CONFIG.Dice.D20Roll && !r.options?.embeddedSave);
        const currentState = activityRoll?.hasAdvantage ? ROLL_STATE.ADV : activityRoll?.hasDisadvantage ? ROLL_STATE.DIS : null;
        if (activityRoll && currentState === state) {
            // Prefer the snapshot of the original roll if it really was a normal roll; otherwise
            // rebuild a normal roll from the first-rolled die.
            const baseJSON = message.flags[MODULE_SHORT].baseAttackRollJSON;
            const snapIsNormal = baseJSON && !(baseJSON.options?.advantageMode);
            const restored = snapIsNormal
                ? CONFIG.Dice.D20Roll.fromData(foundry.utils.deepClone(baseJSON))
                : RollUtility.downgradeRoll(activityRoll);
            message.rolls[message.rolls.indexOf(activityRoll)] = restored;
            message.flags[MODULE_SHORT].advantage = false;
            message.flags[MODULE_SHORT].disadvantage = false;
            ChatUtility.updateChatMessage(message, { flags: message.flags, rolls: message.rolls });
            CoreUtility.playRollSound();
            return;
        }

        const target = state === ROLL_STATE.ADV ? CoreUtility.localize("DND5E.Advantage") : CoreUtility.localize("DND5E.Disadvantage");
        const confirmed = await DialogUtility.getConfirmDialog(
            CoreUtility.localize(`${MODULE_SHORT}.chat.prompts.retroAdv`, {
                target,
            }),
            dialogOptions,
        );

        if (!confirmed) return;

        if (activityRoll) message.flags[MODULE_SHORT].baseAttackRollJSON ??= foundry.utils.deepClone(activityRoll.toJSON());

        if (key === ROLL_TYPE.ABILITY_SAVE) {
            // Retroactive adv/dis on an embedded save — find the save roll by speaker name.
            const speaker = $(button).closest("[data-save-speaker]")[0]?.dataset.saveSpeaker;
            const saveRoll =
                message.rolls.find(r => r.options?.embeddedSave && r.options?.embeddedSaveSpeaker === speaker) ??
                message.rolls.find(r => r instanceof CONFIG.Dice.D20Roll && !r.options?.embeddedSave) ??
                message.rolls.find(r => r instanceof CONFIG.Dice.D20Roll);
            if (!saveRoll) return;
            await RollUtility.upgradeRoll(saveRoll, state);
            if (message.isOwner) {
                ChatUtility.updateChatMessage(message, { rolls: message.rolls });
            } else {
                // Player owns the saving actor but not the activity message — ask GM to update.
                game.socket.emit(`module.${MODULE_NAME}`, {
                    type: "retroSave",
                    messageId: message.id,
                    speaker,
                    rollJSON: saveRoll.toJSON(),
                });
            }
        } else {
            message.flags[MODULE_SHORT].advantage = state === ROLL_STATE.ADV;
            message.flags[MODULE_SHORT].disadvantage = state === ROLL_STATE.DIS;

            const roll = message.rolls.find((r) => r instanceof CONFIG.Dice.D20Roll && !r.options?.embeddedSave);
            await RollUtility.upgradeRoll(roll, state);

            if (key !== ROLL_TYPE.ATTACK && key !== ROLL_TYPE.TOOL_CHECK) {
                message.flavor += message.rolls[0].hasAdvantage
                    ? ` (${CoreUtility.localize("DND5E.Advantage")})`
                    : ` (${CoreUtility.localize("DND5E.Disadvantage")})`;
            }

            ChatUtility.updateChatMessage(message, {
                flags: message.flags,
                rolls: message.rolls,
                flavor: message.flavor,
            });
        }

        CoreUtility.playRollSound();
    }
}

/**
 * Re-derive the damage rolls from the stored base rolls and the current CRIT / MAX toggle state.
 * Both toggles are independent and combinable; turning one off re-applies only the other.
 * @param {ChatMessage} message
 * @private
 */
async function _applyDamageModifiers(message) {
    const flags = message.flags[MODULE_SHORT];

    // Snapshot originals on first use; always restore before applying so the modifiers never stack.
    _snapshotBaseRolls(message);
    _restoreBaseRolls(message);

    if (flags.isCritical) {
        let crits;
        if (flags.critRollsJSON) {
            // Reuse the crit dice rolled the first time so toggling doesn't re-randomise them.
            crits = flags.critRollsJSON.map((j) => CONFIG.Dice.DamageRoll.fromData(foundry.utils.deepClone(j)));
        } else {
            const base = message.rolls.filter((r) => r instanceof CONFIG.Dice.DamageRoll);
            crits = flags.isHealing ? await ActivityUtility.getHealingFromMessage(message) : await ActivityUtility.getDamageFromMessage(message);
            crits = Array.from(crits ?? []);
            for (let i = 0; i < crits.length; i++) {
                const baseRoll = base[i];
                const critRoll = crits[i];
                if (!baseRoll) continue;
                // Keep the originally rolled dice; only the extra crit dice are new.
                for (const [j, term] of baseRoll.terms.entries()) {
                    if (!(term instanceof foundry.dice.terms.Die) || !(critRoll.terms[j] instanceof foundry.dice.terms.Die)) continue;
                    critRoll.terms[j].results.splice(0, term.results.length, ...term.results);
                }
                RollUtility.resetRollGetters(critRoll);
            }
            flags.critRollsJSON = crits.map((r) => foundry.utils.deepClone(r.toJSON()));
        }

        // Extra flat rolls appended by roll-model (e.g. Celestial Revelation) have no crit
        // counterpart and are left as they are.
        let idx = 0;
        for (let i = 0; i < message.rolls.length; i++) {
            if (!(message.rolls[i] instanceof CONFIG.Dice.DamageRoll)) continue;
            if (crits[idx]) message.rolls[i] = crits[idx];
            idx++;
        }
    }

    if (flags.isMaximized) {
        for (const roll of message.rolls) {
            if (!(roll instanceof CONFIG.Dice.DamageRoll)) continue;
            for (const term of roll.terms) {
                if (!(term instanceof foundry.dice.terms.Die)) continue;
                for (const result of term.results) result.result = term.faces;
            }
            RollUtility.resetRollGetters(roll);
        }
    }

    _applyDamageRollUpdate(message);
    CoreUtility.playRollSound();
}

/**
 * CRIT toggle: turn critical damage on/off (combinable with MAX).
 * @param {ChatMessage} message The chat message for which an event is being processed.
 * @param {Event} event The originating event of the button click.
 * @private
 */
async function _processRetroCritButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.dataset.action !== "rm-retro") return;

    const flags = message.flags[MODULE_SHORT];
    if (!flags.isCritical) {
        const confirmed = await DialogUtility.getConfirmDialog(CoreUtility.localize(`${MODULE_SHORT}.chat.prompts.retroCrit`), {
            width: 100,
            top: event ? event.clientY - 50 : null,
            left: window.innerWidth - 510,
        });
        if (!confirmed) return;
    }

    flags.isCritical = !flags.isCritical;
    await _applyDamageModifiers(message);
}

/**
 * MAX toggle: maximize every damage die on/off (combinable with CRIT).
 * @param {ChatMessage} message The chat message for which an event is being processed.
 * @param {Event} event The originating event of the button click.
 * @private
 */
async function _processRetroMaxButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.dataset.action !== "rm-retro") return;

    const flags = message.flags[MODULE_SHORT];
    if (!flags.isMaximized) {
        const confirmed = await DialogUtility.getConfirmDialog(CoreUtility.localize(`${MODULE_SHORT}.chat.prompts.retroMax`), {
            width: 100,
            top: event ? event.clientY - 50 : null,
            left: window.innerWidth - 510,
        });
        if (!confirmed) return;
    }

    flags.isMaximized = !flags.isMaximized;
    await _applyDamageModifiers(message);
}

function _snapshotBaseRolls(message) {
    if (message.flags[MODULE_SHORT].baseRollsJSON) return;
    const damageRolls = message.rolls.filter(r => r instanceof CONFIG.Dice.DamageRoll);
    message.flags[MODULE_SHORT].baseRollsJSON = damageRolls.map(r => foundry.utils.deepClone(r.toJSON()));
}

function _restoreBaseRolls(message) {
    const snapshots = message.flags[MODULE_SHORT].baseRollsJSON;
    if (!snapshots) return;
    const restored = snapshots.map(j => CONFIG.Dice.DamageRoll.fromData(foundry.utils.deepClone(j)));
    let idx = 0;
    for (let i = 0; i < message.rolls.length; i++) {
        if (message.rolls[i] instanceof CONFIG.Dice.DamageRoll) {
            message.rolls[i] = restored[idx++];
        }
    }
}

function _applyDamageRollUpdate(message) {
    if (message.isOwner) {
        ChatUtility.updateChatMessage(message, { flags: message.flags, rolls: message.rolls });
    } else {
        const damageRolls = message.rolls.filter(r => r instanceof CONFIG.Dice.DamageRoll);
        game.socket.emit(`module.${MODULE_NAME}`, {
            type: "retroDamage",
            messageId: message.id,
            flags: foundry.utils.deepClone(message.flags),
            rollsJSON: damageRolls.map(r => r.toJSON()),
        });
    }
}


/**
 * Mark the card's save button according to the controlled tokens' recorded outcomes
 * (dnd5e 6.0 `system.outcomes`, token uuid → "success"/"failure"):
 *  - one token controlled and it has saved → green (passed) or red (failed);
 *  - several controlled and all have saved → neutral grey (already rolled);
 *  - otherwise no marking.
 * @param {HTMLElement|JQuery} root  The message <li> (or its content).
 * @param {ChatMessage} message      The usage message.
 */
function _updateSaveButtonState(root, message) {
    const el = root instanceof $ ? root[0] : root;
    const saveBtn = el?.querySelector('[data-action="rollSave"]');
    if (!saveBtn) return;

    const controlled = canvas.tokens?.controlled ?? [];
    saveBtn.classList.remove("rm-already-applied", "rm-save-failed", "rm-save-passed");
    if (!controlled.length) return;

    const outcomes = message?.system?.outcomes;
    if (!(outcomes instanceof Map) || !outcomes.size) return;

    const results = controlled.map((t) => outcomes.get(t.document?.uuid));
    if (!results.every((r) => r === "success" || r === "failure")) {
        LogUtility.log(`[RM DEBUG] _updateSaveButtonState messageId=${message.id}: not all controlled tokens have saved (${results.join(",")})`);
        return;
    }

    const state = controlled.length > 1 ? "rm-already-applied" : results[0] === "success" ? "rm-save-passed" : "rm-save-failed";
    saveBtn.classList.add(state);
    LogUtility.log(`[RM DEBUG] _updateSaveButtonState messageId=${message.id} controlled=${controlled.length} state=${state}`);
}

function _autoSetHalfDamageForFailedSaves(message, html) {
    const embeddedSaves = message.flags?.[MODULE_SHORT]?.embeddedSaves;
    if (!embeddedSaves || !Object.keys(embeddedSaves).length) {
        return;
    }

    const controlled = canvas.tokens?.controlled ?? [];
    if (!controlled.length) return;

    const root = html instanceof $ ? html[0] : html;
    const damageApp = root?.querySelector("damage-application");
    if (!damageApp) return;

    for (const token of controlled) {
        if (!embeddedSaves[token.name]) continue;

        const saveRoll = (message.rolls ?? []).find(r =>
            r.options?.embeddedSave && r.options?.embeddedSaveSpeaker === token.name
        );
        if (!saveRoll) continue;

        const dc = saveRoll.options?.target;
        if (dc === undefined || saveRoll.total < dc) {
            continue;
        }

        // Mixin buildTargetsList uses t.actor.uuid (not token document UUID) as the Map key
        const uuid = token.actor?.uuid;
        if (!uuid) continue;

        const options = damageApp.getTargetOptions(uuid);
        options.multiplier = 0.5;

        // Refresh the rendered entry if the tray is already open
        const entry = damageApp.querySelector(`[data-target-uuid="${uuid}"]`);
        if (entry) {
            const actor = fromUuidSync(uuid);
            if (actor) damageApp.refreshListEntry(actor, entry, options);
        }
    }
}

async function _injectEmbeddedSave(message, html) {
    // html is .message-content — wrapper is prepended so saves appear above the card and above the ack badge.
    const embeddedSaves = message.flags[MODULE_SHORT].embeddedSaves;

    if (!embeddedSaves) {
        return;
    }

    const entries = Object.entries(embeddedSaves);
    if (!entries.length) {
        return;
    }

    const wrapper = $('<div class="rm-embedded-saves"></div>');

    const headerEl = $(`<div class="rm-saves-header">
        <i class="fas fa-shield-heart"></i>
        <span>${CoreUtility.localize("DND5E.SavingThrow")}s</span>
        <i class="fas fa-chevron-down rm-saves-caret"></i>
    </div>`);
    wrapper.append(headerEl);

    // dnd5e2 chat-card context needed for dice roll CSS inside the content.
    const savesContent = $('<div class="rm-saves-content dnd5e2 chat-card"></div>');

    for (const [speakerName] of entries) {
        const saveRoll = message.rolls.find(r =>
            r.options?.embeddedSave && r.options?.embeddedSaveSpeaker === speakerName
        );
        if (!saveRoll) {
            continue;
        }

        RollUtility.resetRollGetters(saveRoll);
        saveRoll.options.displayChallenge ??= true;

        const render = await RenderUtility.render(TEMPLATE.MULTIROLL, {
            roll: saveRoll,
            key: ROLL_TYPE.ABILITY_SAVE,
        });

        // Use the same full dice-roll structure as _injectAttackRoll so dnd5e's CSS applies correctly.
        const ChatMessage5e = CONFIG.ChatMessage.documentClass;
        const chatData = await saveRoll.toMessage({}, { create: false });
        const rollHTML = $(await new ChatMessage5e(chatData).renderHTML()).find(".dice-roll");
        rollHTML.find(".dice-total").replaceWith(render);
        rollHTML.find(".dice-tooltip").prepend(rollHTML.find(".dice-formula"));

        const labeledFormula = RollUtility.buildLabeledFormula(saveRoll);
        if (labeledFormula) {
            rollHTML.find(".dice-formula").text(labeledFormula);
        }

        const sectionHTML = $(await RenderUtility.render(TEMPLATE.SECTION, {
            section: `rm-section-${ROLL_TYPE.ABILITY_SAVE}`,
            title: speakerName,
            icon: '<i class="fas fa-shield-heart"></i>',
        }));
        sectionHTML.attr("data-save-speaker", speakerName);

        sectionHTML.append(rollHTML);
        savesContent.append(sectionHTML);
    }

    wrapper.append(savesContent);

    headerEl.on("click", () => wrapper.toggleClass("collapsed"));

    html.prepend(wrapper);
}

async function _processSaveButtonEvent(message, button, event) {
    const ability = button.dataset.ability;
    const token = canvas.tokens.controlled[0];
    if (!token) {
        ui.notifications.warn(game.i18n.localize("DND5E.ActionWarningNoToken"));
        return;
    }

    const actor = token.actor;
    const speakerName = token.name;

    const activityObj = message.getAssociatedActivity?.();
    const dcRaw = activityObj?.save?.dc;
    const liveDc = typeof dcRaw === "number" ? dcRaw : dcRaw?.value ?? dcRaw?.flat ?? undefined;

    // Some DCs (e.g. Relentless Rage's "10 + uses spent * 5") are formula-driven off a
    // resource that can change between when this card was posted and when the button is
    // clicked. Re-deriving the DC live would silently judge the roll against a value that
    // no longer matches what's printed on the button, so prefer the DC baked into the
    // button's own label at render time and only fall back to the live value if it can't be read.
    const printedDc = parseInt(button.textContent?.match(/\d+/)?.[0], 10);
    const dc = Number.isFinite(printedDc) ? printedDc : liveDc;

    const isAdvantage = CoreUtility.areKeysPressed(event, "skipDialogAdvantage");
    const isDisadvantage = CoreUtility.areKeysPressed(event, "skipDialogDisadvantage");

    const rollResult = await actor.rollSavingThrow(
        { ability, advantage: isAdvantage, disadvantage: isDisadvantage },
        { configure: false },
        { create: false }
    );

    const rollArr = CoreUtility.isIterable(rollResult) ? Array.from(rollResult) : (rollResult ? [rollResult] : []);
    const d20Roll = rollArr.find(r => r instanceof CONFIG.Dice.D20Roll) ?? rollArr[0];

    if (!d20Roll) {
        return;
    }

    d20Roll.options.embeddedSave = true;
    d20Roll.options.embeddedSaveSpeaker = speakerName;
    d20Roll.options.displayChallenge = true;
    d20Roll.options.target ??= dc;

    const filteredRolls = message.rolls.filter(r =>
        !r.options?.embeddedSave || r.options?.embeddedSaveSpeaker !== speakerName
    );
    filteredRolls.push(d20Roll);

    const existingSaves = message.flags[MODULE_SHORT]?.embeddedSaves ?? {};
    existingSaves[speakerName] = { ability };

    if (message.isOwner || game.user.isGM) {
        await ChatUtility.updateChatMessage(message, {
            rolls: filteredRolls,
            [`flags.${MODULE_SHORT}.embeddedSaves`]: existingSaves,
        });
    } else {
        game.socket.emit(`module.${MODULE_NAME}`, {
            type: "embeddedSave",
            messageId: message.id,
            rollJSON: d20Roll.toJSON(),
            speakerName,
            ability,
        });
    }

    CoreUtility.playRollSound();
}

