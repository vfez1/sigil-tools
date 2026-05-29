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
            ui.chat.scrollBottom();
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

        ChatUtility._chatPinnedToBottom = true;
        ui.chat.scrollBottom();
    }

    // Registers a scroll listener on the chat log to track whether the user is pinned
    // to the bottom. Call once on ready. Drives controlToken scroll.
    static setupScrollListener() {
        const rawEl = ui.chat?.element;
        const root = rawEl instanceof HTMLElement ? rawEl : rawEl?.[0];
        if (!root) return;
        // Capture phase catches scroll on any scrollable child; e.target is the actual scrolling element
        root.addEventListener("scroll", (e) => {
            const t = e.target;
            const dist = t.scrollHeight - t.scrollTop - t.clientHeight;
            if (dist <= 20) ChatUtility._chatPinnedToBottom = true;
            else if (dist > 100) ChatUtility._chatPinnedToBottom = false;
        }, { passive: true, capture: true });
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

    html.find(".rm-overlay").show();
    html.find(".rm-overlay-multiroll").toggle(hasPermission && !ChatUtility.isMessageMultiRoll(message));
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

            html.find(".dnd5e2.chat-card").not(".activation-card").remove();
            break;
        default:
            break;
    }

    _setupCardListeners(message, html);
}

async function _injectAttackRoll(message, html) {
    const ChatMessage5e = CONFIG.ChatMessage.documentClass;
    const roll = message.rolls.find((r) => r instanceof CONFIG.Dice.D20Roll);

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
              title: CoreUtility.localize("DND5E.Healing"),
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
              title: CoreUtility.localize("DND5E.Healing"),
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

        message.flags[MODULE_SHORT].advantage = state === ROLL_STATE.ADV;
        message.flags[MODULE_SHORT].disadvantage = state === ROLL_STATE.DIS;

        const roll = message.rolls.find((r) => r instanceof CONFIG.Dice.D20Roll);
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
