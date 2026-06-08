import { MODULE_SHORT } from "../../shared/const.js";
import { ChatUtility } from "./chat.js";
import { CoreUtility } from "./core.js";
import { ROLL_TYPE, RollUtility } from "./roll.js";

/**
 * Utility class to handle quick rolling functionality for activities.
 */
export class ActivityUtility {
    static setRenderFlags(activity, message) {
        const messageFlags = message.flags ?? message.data?.flags;
        const rmFlags = messageFlags?.[MODULE_SHORT];
        if (!rmFlags) return;

        if (!rmFlags.quickRoll) return;

        const hasAttack = activity.hasOwnProperty(ROLL_TYPE.ATTACK);
        const hasDamage = activity.hasOwnProperty(ROLL_TYPE.DAMAGE);
        const hasHealing = activity.hasOwnProperty(ROLL_TYPE.HEALING);
        const hasFormula = activity.hasOwnProperty(ROLL_TYPE.FORMULA);

        if (hasAttack) {
            rmFlags.renderAttack = true;

            const actor = activity.actor;
            const item = activity.item;
            const hasGWMFeat = actor?.items.some((i) => i.type === "feat" && i.name === "Great Weapon Master");
            const isHeavy = item?.system?.properties?.has("hvy");

            if (hasGWMFeat && isHeavy) {
                rmFlags.gwmEligible = true;
                rmFlags.gwmActive = true;
            } else {
                rmFlags.gwmEligible = false;
                rmFlags.gwmActive = false;
            }

            const celestialRevelationInfo = RollUtility.getCelestialShroudEffect(actor);
            if (celestialRevelationInfo) {
                rmFlags.celestialRevelationEligible = true;
                rmFlags.celestialRevelationDamageType = celestialRevelationInfo.damageType;
                rmFlags.celestialRevelationActive = false;
            } else {
                rmFlags.celestialRevelationEligible = false;
                rmFlags.celestialRevelationActive = false;
            }
        }

        if (hasDamage && activity[ROLL_TYPE.DAMAGE]?.parts?.length > 0) {
            rmFlags.renderDamage = true;
        }

        if (hasHealing) {
            rmFlags.isHealing = true;
            rmFlags.renderDamage = true;
        }

        if (hasFormula && activity[ROLL_TYPE.FORMULA]?.formula) {
            rmFlags.renderFormula = true;

            if (activity.roll?.name && activity.roll.name !== "") {
                rmFlags.formulaName = activity.roll?.name;
            }
        }
    }

    static async runActivityActions(message) {
        const flags = message.flags?.[MODULE_SHORT] ?? message.data?.flags?.[MODULE_SHORT] ?? {};
        let rolledDice = false;

        if (flags.renderAttack) {
            const attackRolls = await ActivityUtility.getAttackFromMessage(message);
            _injectRollsToMessage(message, attackRolls, CONFIG.Dice.D20Roll);
            rolledDice ||= _hasDice(attackRolls);

            message.flags[MODULE_SHORT].isCritical = flags.dual ? false : attackRolls[0].isCritical;
        }

        if (flags.renderDamage) {
            const damageRolls = await ActivityUtility.getDamageFromMessage(message);
            _injectRollsToMessage(message, damageRolls, CONFIG.Dice.DamageRoll);
            rolledDice ||= _hasDice(damageRolls);
        }

        if (flags.renderFormula) {
            const formulaRolls = await ActivityUtility.getFormulaFromMessage(message);
            _injectRollsToMessage(message, formulaRolls, CONFIG.Dice.BasicRoll);
            rolledDice ||= _hasDice(formulaRolls);
        }

        message.flags[MODULE_SHORT].processed = true;

        ChatUtility.updateChatMessage(message, {
            flags: message.flags,
            rolls: message.rolls,
        });

        if (rolledDice) {
            CoreUtility.playRollSound();
        }
    }

    static getAttackFromMessage(message) {
        const activity = message.getAssociatedActivity();
        const flags = message.flags?.[MODULE_SHORT] ?? message.data?.flags?.[MODULE_SHORT] ?? {};

        const usageConfig = {
            advantage: flags.advantage ?? false,
            disadvantage: flags.disadvantage ?? false,
            ammunition: flags.ammunition,
        };

        const dialogConfig = {
            configure: false,
        };

        const messageConfig = {
            create: false,
            data: {
                flags: {},
            },
        };

        messageConfig.data.flags[MODULE_SHORT] = {
            quickRoll: true,
        };

        return activity.rollAttack(usageConfig, dialogConfig, messageConfig);
    }

    static getDamageFromMessage(message) {
        const activity = message.getAssociatedActivity();
        const actor = message.getAssociatedActor();

        const flags = (message.flags ?? message.data?.flags)?.[MODULE_SHORT] ?? {};

        const activityItem = activity.item;
        activityItem.flags.dnd5e ??= {};
        const dnd5eScaling = (message.flags ?? message.data?.flags)?.dnd5e?.scaling;
        // Fallback: for pool-based heal activities (e.g. Lay on Hands), dnd5e does not
        // write the chosen amount to message.flags.dnd5e.scaling.  It was captured from
        // usageConfig in the ACTIVITY_CONSUMPTION hook and saved as flags[MODULE_SHORT].healingScaling.
        activityItem.flags.dnd5e.scaling = dnd5eScaling ?? flags.healingScaling;

        const usageConfig = {
            isCritical: flags.isCritical ?? false,
            attackMode: flags.versatile ? "twoHanded" : undefined,
            ammunition: actor.items.get(flags.ammunition),
            scaling: activityItem.flags.dnd5e.scaling,
        };

        const dialogConfig = {
            configure: false,
        };

        const messageConfig = {
            create: false,
            data: {
                flags: {},
            },
        };

        messageConfig.data.flags[MODULE_SHORT] = {
            quickRoll: true,
        };

        return activity.rollDamage(usageConfig, dialogConfig, messageConfig);
    }

    static getFormulaFromMessage(message) {
        const activity = message.getAssociatedActivity();
        activity.item.flags.dnd5e ??= {};
        activity.item.flags.dnd5e.scaling = (message.flags ?? message.data?.flags)?.dnd5e?.scaling;

        const usageConfig = {
            scaling: activity.item.flags.dnd5e.scaling,
        };

        const dialogConfig = {
            configure: false,
        };

        const messageConfig = {
            create: false,
        };

        return activity.rollFormula(usageConfig, dialogConfig, messageConfig);
    }
}

function _injectRollsToMessage(message, rolls, cleanType) {
    if (!message || !CoreUtility.isIterable(rolls)) {
        return;
    }

    if (cleanType) {
        message.rolls = message.rolls.filter((r) => !(r instanceof cleanType));
    }

    message.rolls.push(...rolls);
}

function _hasDice(rolls) {
    if (!CoreUtility.isIterable(rolls)) return false;
    return Array.from(rolls).some((roll) => roll?.dice?.length > 0);
}
