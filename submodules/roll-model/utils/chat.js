import { MODULE_NAME, MODULE_SHORT } from "../../shared/const.js";
import { TEMPLATE } from "../config/templates.js";
import { ActivityUtility } from "./activity.js";
import { CoreUtility } from "./core.js";
import { DialogUtility } from "./dialog.js";
import { RenderUtility } from "./render.js";
import { ROLL_STATE, ROLL_TYPE, RollUtility } from "./roll.js";

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

        await _injectDamageApplicationTray(message, $(html));

        if (!message.flags || Object.keys(message.flags).length === 0) {
            return;
        }

        if (!message.flags[MODULE_SHORT] || !message.flags[MODULE_SHORT].quickRoll) {
            // Clear stale flavor text for enricher damage messages (dnd5e 5.3 moved the key)
            if (message.flags.dnd5e?.messageType === "roll" && !message.flags.dnd5e?.item?.id) {
                $(html).find(".flavor-text").text("");
            }
            return;
        }

        const type = ChatUtility.getMessageType(message);

        // Hide the message if we haven't yet finished processing RSR content
        if (!message.flags[MODULE_SHORT].processed) {
            await $(html).addClass("rm-hide");

            if (type == ROLL_TYPE.ACTIVITY && message.isAuthor) {
                ActivityUtility.runActivityActions(message);
            }

            return;
        }

        const content = $(html).find(".message-content");

        if (content.length === 0) {
            await $(html).removeClass("rm-hide");
            if (ChatUtility._chatPinnedToBottom) requestAnimationFrame(() => ChatUtility._scrollToBottom());
            return;
        }

        await _injectContent(message, type, content);
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

    static getMessageType(message) {
        // dnd5e v5.x: usage messages use message.type === "usage" rather than a flag
        if (message.type === "usage" || message.flags.dnd5e?.messageType === MESSAGE_TYPE.USAGE) {
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
            const embeddedSaves = message.flags?.[MODULE_SHORT]?.embeddedSaves;
            if (!embeddedSaves) continue;
            const li = document.querySelector(`[data-message-id="${message.id}"]`);
            if (!li) continue;
            _updateSaveButtonState(li, embeddedSaves, message.rolls);
        }
    }

    static registerSaveSocketListener() {
        game.socket.on(`module.${MODULE_NAME}`, async (data) => {
            if (!game.user.isGM) return;
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
    const hasPermission = game.user.isGM || message?.isAuthor;
    const isItem = message.flags.dnd5e?.use !== undefined;

    // Save-section overlays are handled by per-section hover in _injectOverlayRetroButtons
    const saveOverlays = html.find("[data-save-speaker] .rm-overlay");
    html.find(".rm-overlay").not(saveOverlays).show();
    const saveMultiRollOverlays = html.find("[data-save-speaker] .rm-overlay-multiroll");
    html.find(".rm-overlay-multiroll").not(saveMultiRollOverlays).toggle(hasPermission && !ChatUtility.isMessageMultiRoll(message));
    html.find(".rm-overlay-crit").toggle(hasPermission && isItem && !ChatUtility.isMessageCritical(message));
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
    html.find(".rm-type-pill").click(async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const pill = $(event.currentTarget);
        const selector = pill.closest(".rm-type-selector");
        const newType = pill.data("type");
        const partIndex = pill.data("part");
        const label = CONFIG[MODULE_SHORT]?.combinedDamageTypes?.[newType] ?? newType;

        selector.find(".rm-type-pill").removeClass("active");
        pill.addClass("active");

        // Update the label inside the tooltip for the corresponding damage part
        const tooltipParts = html.closest(".message-content").find(".rm-damage .tooltip-part");
        tooltipParts.eq(partIndex).find(".dice .total .label").text(label);

        // Update the damage-application tray so applied damage uses the selected type
        const damageApp = html.closest(".message").find("damage-application")[0];
        if (damageApp?.damages && partIndex >= 0 && partIndex < damageApp.damages.length) {
            damageApp.damages[partIndex].type = newType;
            damageApp.buildTargetsList();
        }

        // Save preference to item flag for persistence across rolls
        const item = message.getAssociatedItem?.();
        if (item?.isOwner) {
            const prefs = item.getFlag(MODULE_NAME, "damageTypePrefs") ?? {};
            prefs[partIndex] = newType;
            await item.setFlag(MODULE_NAME, "damageTypePrefs", prefs);
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

    // Mark save button completed/failed if the controlled token already has a save on this card.
    const embeddedSavesForBtn = message.flags[MODULE_SHORT]?.embeddedSaves ?? {};
    if (Object.keys(embeddedSavesForBtn).length > 0) {
        _updateSaveButtonState(html[0] ?? html, embeddedSavesForBtn, message.rolls);
        _autoSetHalfDamageForFailedSaves(message, html);
    }
}

async function _injectContent(message, type, html) {
    const parent = message.getOriginatingMessage();
    message.flags[MODULE_SHORT].displayChallenge = parent?.shouldDisplayChallenge ?? message.shouldDisplayChallenge;
    message.flags[MODULE_SHORT].displayAttackResult = game.user.isGM || game.settings.get("dnd5e", "attackRollVisibility") !== "none";

    switch (type) {
        case ROLL_TYPE.DAMAGE:
            // Handle damage enrichers
            if (!message.flags.dnd5e?.item?.id) {
                const enricher = html.find(".dice-roll");

                html.parent().find(".flavor-text").text("");
                html.prepend('<div class="dnd5e2 chat-card"></div>');
                html.find(".chat-card").append(enricher);

                message.flags[MODULE_SHORT].renderDamage = true;
                message.flags[MODULE_SHORT].isCritical = message.rolls[0]?.isCritical;

                await _injectDamageRoll(message, enricher);
                enricher.remove();
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
            roll.options.forceSuccess = message.flags.dnd5e?.roll?.forceSuccess;

            const render = await RenderUtility.render(TEMPLATE.MULTIROLL, {
                roll,
                key: type,
            });
            html.find(".dice-total").replaceWith(render);
            html.find(".dice-tooltip").prepend(html.find(".dice-formula"));

            if (message.flags[MODULE_SHORT].isConcentration) {
                await _injectBreakConcentrationButton(message, html);
            }
            break;
        case ROLL_TYPE.ACTIVITY:
            if (!message.isContentVisible) {
                return;
            }

            const actions = html.find(".card-buttons");

            // Remove any redundant dice roll elements that were added forcefully by dnd5e system
            html.find(".dice-roll").remove();

            if (message.flags[MODULE_SHORT].renderAttack || message.flags[MODULE_SHORT].renderAttack === false) {
                actions.find(`[data-action=rollAttack]`).remove();
                await _injectAttackRoll(message, actions);

                html.find(".rm-section-attack").append(html.find(".supplement"));
                html.find(".supplement").removeClass("supplement").addClass("rm-supplement");
            }

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
            break;
        default:
            break;
    }

    _setupCardListeners(message, html);
}

async function _injectAttackRoll(message, html) {
    const ChatMessage5e = CONFIG.ChatMessage.documentClass;
    const roll = message.rolls.find((r) => r instanceof CONFIG.Dice.D20Roll && !r.options?.embeddedSave);

    if (!roll) return;

    RollUtility.resetRollGetters(roll);

    roll.options.displayChallenge = message.flags[MODULE_SHORT].displayAttackResult;

    const render = await RenderUtility.render(TEMPLATE.MULTIROLL, {
        roll,
        key: ROLL_TYPE.ATTACK,
    });
    const chatData = await roll.toMessage({}, { create: false });
    const rollHTML = $(await new ChatMessage5e(chatData).renderHTML()).find(".dice-roll");
    rollHTML.find(".dice-total").replaceWith(render);
    rollHTML.find(".dice-tooltip").prepend(rollHTML.find(".dice-formula"));

    const labeledFormula = RollUtility.buildLabeledFormula(roll);
    if (labeledFormula) {
        rollHTML.find(".dice-formula").text(labeledFormula);
    }

    if (roll.options.hideFinalAttack) {
        rollHTML.find(".dice-tooltip").find(".tooltip-part.constant").remove();
        rollHTML.find(".dice-formula").text("1d20 + " + CoreUtility.localize(`${MODULE_SHORT}.chat.hide`));
    }

    const ammo = message.getAssociatedActor()?.items?.get(message.flags[MODULE_SHORT].ammunition)?.name;

    const sectionHTML = $(
        await RenderUtility.render(TEMPLATE.SECTION, {
            section: `rm-section-${ROLL_TYPE.ATTACK}`,
            title: CoreUtility.localize("DND5E.Attack"),
            icon: '<dnd5e-icon src="systems/dnd5e/icons/svg/trait-weapon-proficiencies.svg"></dnd5e-icon>',
            subtitle: ammo ? `${CoreUtility.localize("DND5E.CONSUMABLE.Type.Ammunition.Label")} - ${ammo}` : undefined,
        }),
    );

    $(sectionHTML).append(rollHTML);
    sectionHTML.insertBefore(html);
}

async function _injectFormulaRoll(message, html) {
    const ChatMessage5e = CONFIG.ChatMessage.documentClass;
    const roll = message.rolls.find((r) => r instanceof CONFIG.Dice.BasicRoll);

    if (!roll) return;

    const chatData = await roll.toMessage({}, { create: false });
    const rollHTML = $(await new ChatMessage5e(chatData).renderHTML()).find(".dice-roll");
    rollHTML.find(".dice-tooltip").prepend(rollHTML.find(".dice-formula"));

    const sectionHTML = $(
        await RenderUtility.render(TEMPLATE.SECTION, {
            section: `rm-section-${ROLL_TYPE.FORMULA}`,
            title: message.flags[MODULE_SHORT].formulaName ?? CoreUtility.localize("DND5E.OtherFormula"),
            icon: '<i class="fas fa-dice"></i>',
        }),
    );

    $(sectionHTML).append(rollHTML);
    sectionHTML.insertBefore(html);
}

async function _injectDamageRoll(message, html) {
    const ChatMessage5e = CONFIG.ChatMessage.documentClass;
    const rolls = message.rolls.filter((r) => r instanceof CONFIG.Dice.DamageRoll);

    if (!rolls || rolls.length === 0) return;

    // Load saved damage type preferences from the item and apply before rendering
    const item = message.getAssociatedItem?.();
    const savedPrefs = item?.getFlag(MODULE_NAME, "damageTypePrefs") ?? {};
    for (let i = 0; i < rolls.length; i++) {
        const roll = rolls[i];
        if (roll.options.types?.length > 1 && savedPrefs[i] && roll.options.types.includes(savedPrefs[i])) {
            roll.options.type = savedPrefs[i];
        }
    }

    const chatData = await CONFIG.Dice.DamageRoll.toMessage(rolls, {}, { create: false });
    const rollHTML = $(await new ChatMessage5e(chatData).renderHTML()).find(".dice-roll");
    rollHTML.find(".dice-tooltip").prepend(rollHTML.find(".dice-formula"));
    rollHTML.find(".dice-result").addClass("rm-damage");

    const labeledFormulas = rolls.map((roll) => RollUtility.buildLabeledDamageFormula(roll)).filter(Boolean);
    if (labeledFormulas.length) {
        const formulaElements = rollHTML.find(".dice-formula");
        if (formulaElements.length === labeledFormulas.length) {
            formulaElements.each((i, element) => $(element).text(labeledFormulas[i]));
        } else {
            formulaElements.first().text(labeledFormulas.join(" + "));
        }
    }

    const header = message.flags[MODULE_SHORT].isHealing
        ? {
              section: `rm-section-${ROLL_TYPE.DAMAGE}`,
              title: CoreUtility.localize("DND5E.HEAL.HealingButton"),
              icon: '<dnd5e-icon src="systems/dnd5e/icons/svg/damage/healing.svg"></dnd5e-icon>',
          }
        : {
              section: `rm-section-${ROLL_TYPE.DAMAGE}`,
              title: `${CoreUtility.localize("DND5E.Damage")} ${message.flags[MODULE_SHORT].versatile ? "(" + CoreUtility.localize("DND5E.Versatile") + ")" : ""}`,
              icon: '<i class="fas fa-burst"></i>',
              subtitle: message.flags[MODULE_SHORT].isCritical ? `${CoreUtility.localize("DND5E.CriticalHit")}!` : undefined,
              critical: message.flags[MODULE_SHORT].isCritical,
          };

    const sectionHTML = $(await RenderUtility.render(TEMPLATE.SECTION, header));

    $(sectionHTML).append(rollHTML);

    // Inject damage type selector pills outside the collapsible tooltip,
    // between the damage total and the damage-application tray.
    for (let i = 0; i < rolls.length; i++) {
        const roll = rolls[i];
        if (roll.options.types && roll.options.types.length > 1) {
            const types = roll.options.types.map((t) => ({
                key: t,
                label: CONFIG[MODULE_SHORT]?.combinedDamageTypes?.[t] ?? t,
            }));
            const selectedType = roll.options.type ?? roll.options.types[0];
            const pillsHTML = $('<div class="rm-type-selector"></div>');
            for (const type of types) {
                const pill = $(
                    `<span class="rm-type-pill ${type.key === selectedType ? "active" : ""}" data-type="${type.key}" data-part="${i}">${type.label}</span>`,
                );
                pillsHTML.append(pill);
            }
            sectionHTML.find(".dice-roll").after(pillsHTML);
        }
    }

    const flags = (message.flags ?? message.data?.flags)?.[MODULE_SHORT] ?? {};
    const showCelestialRevelation = flags.celestialRevelationEligible && flags.renderAttack;

    if (flags.gwmEligible || showCelestialRevelation) {
        const row = $('<div class="rm-gwm-row"></div>');

        if (flags.gwmEligible) {
            const gwmActive = flags.gwmActive;
            row.append($(`<label class="rm-gwm-toggle"><input type="checkbox" ${gwmActive ? "checked" : ""}>GWM</label>`));
        }

        if (showCelestialRevelation) {
            const active = flags.celestialRevelationActive;
            row.append($(`<label class="rm-celestial-revelation"><input type="checkbox" ${active ? "checked" : ""}>CR</label>`));
        }

        sectionHTML.append(row);
    }

    sectionHTML.insertBefore(html);

    // Deferred sync: update the damage-application tray once it appears in the DOM.
    // The tray is created by a separate hook (Player Damage Apply / dnd5e system)
    // that fires after our content injection, so we observe for it.
    if (Object.keys(savedPrefs).length > 0) {
        const syncDamageTray = () => {
            const msgEl = document.querySelector(`[data-message-id="${message.id}"]`);
            const damageApp = msgEl?.querySelector("damage-application");
            if (!damageApp?.damages) return false;
            let changed = false;
            for (const [idx, type] of Object.entries(savedPrefs)) {
                const i = parseInt(idx);
                if (i >= 0 && i < damageApp.damages.length && damageApp.damages[i].type !== type && rolls[i]?.options?.types?.includes(type)) {
                    damageApp.damages[i].type = type;
                    changed = true;
                }
            }
            if (changed) damageApp.buildTargetsList();
            return true;
        };

        if (!syncDamageTray()) {
            const msgEl = document.querySelector(`[data-message-id="${message.id}"]`);
            if (msgEl) {
                const observer = new MutationObserver(() => {
                    if (syncDamageTray()) observer.disconnect();
                });
                observer.observe(msgEl, { childList: true, subtree: true });
                setTimeout(() => observer.disconnect(), 5000);
            }
        }
    }
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

    html.find(".rm-multiroll .dice-total").append($(overlayMultiRoll));

    // Handle clicking the multi-roll overlay buttons
    html.find(".rm-overlay-multiroll div").click(async (event) => {
        await _processRetroAdvButtonEvent(message, event);
    });

    const overlayCrit = await RenderUtility.render(TEMPLATE.OVERLAY_CRIT, {});

    html.find(".rm-damage .dice-total").append($(overlayCrit));

    // Handle clicking the multi-roll overlay buttons
    html.find(".rm-overlay-crit div").click(async (event) => {
        await _processRetroCritButtonEvent(message, event);
    });

    // Save-section adv/dis overlays: show only when hovering the specific save section
    const hasPermission = game.user.isGM || message?.isAuthor;
    html.find("[data-save-speaker]").each((_, section) => {
        const $section = $(section);
        $section.hover(
            () => {
                if (!hasPermission) return;
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
    const key = $(button).closest(".rm-multiroll")[0].dataset.key;

    if (action === "rm-retro") {
        const dialogOptions = {
            width: 100,
            top: event ? event.clientY - 50 : null,
            left: window.innerWidth - 510,
        };

        const target = state === ROLL_STATE.ADV ? CoreUtility.localize("DND5E.Advantage") : CoreUtility.localize("DND5E.Disadvantage");
        const confirmed = await DialogUtility.getConfirmDialog(
            CoreUtility.localize(`${MODULE_SHORT}.chat.prompts.retroAdv`, {
                target,
            }),
            dialogOptions,
        );

        if (!confirmed) return;

        if (key === ROLL_TYPE.ABILITY_SAVE) {
            // Retroactive adv/dis on an embedded save — find the save roll by speaker name.
            const speaker = $(button).closest("[data-save-speaker]")[0]?.dataset.saveSpeaker;
            const saveRoll = message.rolls.find(r => r.options?.embeddedSave && r.options?.embeddedSaveSpeaker === speaker);
            if (!saveRoll) return;
            await RollUtility.upgradeRoll(saveRoll, state);
            ChatUtility.updateChatMessage(message, { rolls: message.rolls });
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
 * Processes and handles a retroactive critical roll button click event.
 * @param {ChatMessage} message The chat message for which an event is being processed.
 * @param {Event} event The originating event of the button click.
 * @private
 */
async function _processRetroCritButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const action = button.dataset.action;

    if (action === "rm-retro") {
        const dialogOptions = {
            width: 100,
            top: event ? event.clientY - 50 : null,
            left: window.innerWidth - 510,
        };

        const confirmed = await DialogUtility.getConfirmDialog(CoreUtility.localize(`${MODULE_SHORT}.chat.prompts.retroCrit`), dialogOptions);

        if (!confirmed) return;

        message.flags[MODULE_SHORT].isCritical = true;

        const rolls = message.rolls.filter((r) => r instanceof CONFIG.Dice.DamageRoll);
        const crits = await ActivityUtility.getDamageFromMessage(message);

        for (let i = 0; i < rolls.length; i++) {
            const baseRoll = rolls[i];
            const critRoll = crits[i];

            for (const [j, term] of baseRoll.terms.entries()) {
                if (!(term instanceof foundry.dice.terms.Die)) {
                    continue;
                }

                critRoll.terms[j].results.splice(0, term.results.length, ...term.results);
            }

            RollUtility.resetRollGetters(critRoll);
            message.rolls[message.rolls.indexOf(baseRoll)] = critRoll;
        }

        ChatUtility.updateChatMessage(message, {
            flags: message.flags,
            rolls: message.rolls,
        });

        CoreUtility.playRollSound();
    }
}


function _updateSaveButtonState(root, embeddedSaves, rolls) {
    const el = root instanceof $ ? root[0] : root;
    const saveBtn = el?.querySelector('[data-action="rollSave"]');
    if (!saveBtn) return;

    const controlled = canvas.tokens?.controlled ?? [];
    saveBtn.classList.remove("rm-already-applied", "rm-save-failed");
    if (!controlled.length) return;

    const savedNames = new Set(Object.keys(embeddedSaves));
    if (!controlled.every(t => savedNames.has(t.name))) return;

    const anyFailed = controlled.some(t => {
        const saveRoll = (rolls ?? []).find(r => r.options?.embeddedSave && r.options?.embeddedSaveSpeaker === t.name);
        if (!saveRoll) return false;
        const dc = saveRoll.options?.target;
        return dc !== undefined && saveRoll.total < dc;
    });

    saveBtn.classList.add(anyFailed ? "rm-save-failed" : "rm-already-applied");
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
    const dc = typeof dcRaw === "number" ? dcRaw : dcRaw?.value ?? dcRaw?.flat ?? undefined;

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

/**
 * Injects the damage-application tray into chat cards for non-GM users,
 * allowing players to apply damage to tokens they own.
 * @param {ChatMessage} message The chat message to process.
 * @param {JQuery} html The object data for the chat message.
 * @private
 */
async function _injectDamageApplicationTray(message, html) {
    // Skip if user is GM — the dnd5e system already handles this
    if (game.user.isGM) return;

    // Skip if a damage-application element already exists on this message
    if (html.find("damage-application").length > 0) return;

    // Filter for damage rolls on this message
    const rolls = message.rolls.filter((r) => r instanceof CONFIG.Dice.DamageRoll);
    if (!rolls.length) return;

    // Create and configure the element exactly as the dnd5e system does
    const damageApplication = document.createElement("damage-application");
    damageApplication.damages = dnd5e.dice.aggregateDamageRolls(rolls, { respectProperties: true }).map((roll) => ({
        value: Math.max(0, roll.total),
        type: roll.options.type,
        properties: new Set(roll.options.properties ?? []),
    }));

    // Determine initial open/collapsed state using the same logic as _collapseTrays
    let open;
    switch (game.settings.get("dnd5e", "autoCollapseChatTrays")) {
        case "always":
            open = false;
            break;
        case "never":
        case "manual":
            open = true;
            break;
        case "older":
            open = message.timestamp >= Date.now() - 5 * 60 * 1000;
            break;
        default:
            open = true;
            break;
    }
    damageApplication.toggleAttribute("open", open);
    html.find(".message-content")?.append(damageApplication);
}
