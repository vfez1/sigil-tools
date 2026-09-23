import { MODULE_SHORT } from "../../shared/const.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";

/**
 * Enumerable of identifiers for different roll types that can be made.
 * @enum {String}
 */
export const ROLL_TYPE = {
    SKILL: "skill",
    ABILITY_TEST: "ability",
    ABILITY_SAVE: "save",
    DEATH_SAVE: "death",
    TOOL: "tool",
    ACTIVITY: "activity",
    CHECK: "check",
    ATTACK: "attack",
    DAMAGE: "damage",
    VERSATILE: "versatile",
    OTHER: "formula",
    CONCENTRATION: "concentration",
    HEALING: "healing",
    FORMULA: "roll",
};

/**
 * Enumerable of identifiers for roll states (advantage or disadvantage).
 * @enum {String}
 */
export const ROLL_STATE = {
    ADV: "kh",
    DIS: "kl",
    DUAL: "dual",
    SINGLE: "single",
};

/**
 * Enumerable of identifiers for crit result types.
 * @enum {String}
 */
export const CRIT_TYPE = {
    MIXED: "mixed",
    SUCCESS: "success",
    FAILURE: "failure",
};

const FORMULA_LABEL_ALIASES = {
    "Elemental Fury: Potent Spellcasting": "potentSpellcasting",
    "scale.barbarian.rage-damage": "rage",
    weaponMagic: "weaponBonus",
    magicalBonus: "weaponBonus",
    "Lunar Transformation (Toggle ON when Attuned & Wild Shaped)": "lunarTransformation",
};

/**
 * Utility class for functions related to making specific rolls.
 */
export class RollUtility {
    static processRoll(config, dialog, message) {
        LogUtility.log(
            `[RM DEBUG] processRoll ENTER hookNames=${JSON.stringify(config?.hookNames)} ` +
                `message.data=${_safeKeys(message?.data)} message.data.flags=${_safeKeys(message?.data?.flags)} ` +
                `alreadyProcessed=${message?.data?.flags?.[MODULE_SHORT]?.processed}`
        );

        // dnd5e 6.0: neither `message.data` nor its `flags` is guaranteed to exist at this point in
        // the pipeline (it used to). Actor5e#rollInitiativeDialog, for one, builds the roll with no
        // message data at all. Without these guards the reads and writes below throw, Hooks.call
        // swallows it into a console error, and roll-model's entire interception chain dies
        // silently — leaving the vanilla roll dialog to appear.
        message.data ??= {};
        message.data.flags ??= {};

        if (message.data.flags[MODULE_SHORT]?.processed) {
            LogUtility.log(`[RM DEBUG] processRoll EXIT (already processed)`);
            return;
        }

        const keys = {
            normal: CoreUtility.areKeysPressed(config.event, "skipDialogNormal"),
            advantage: CoreUtility.areKeysPressed(config.event, "skipDialogAdvantage"),
            disadvantage: CoreUtility.areKeysPressed(config.event, "skipDialogDisadvantage"),
        };

        dialog.configure ??= keys.normal || (config.vanilla ?? false);

        if (config.isConcentration) {
            config.flavor = `${CoreUtility.localize("DND5E.ToolPromptTitle", { tool: CoreUtility.localize("DND5E.Concentration") })}`;
        }

        message.data.flags[MODULE_SHORT] = {
            quickRoll: !(dialog.configure ?? true),
            advantage: keys.advantage,
            disadvantage: keys.disadvantage,
            isConcentration: config.isConcentration,
            processed: true,
        };

        LogUtility.log(
            `[RM DEBUG] processRoll EXIT dialog.configure=${dialog.configure} flags=${JSON.stringify(message.data.flags[MODULE_SHORT])}`
        );
    }

    static processActivity(usageConfig, dialogConfig, messageConfig) {
        LogUtility.log(
            `[RM DEBUG] processActivity ENTER hasSpell=${usageConfig?.hasOwnProperty?.("spell")} scaling=${usageConfig?.scaling} ` +
                `messageConfig.data=${_safeKeys(messageConfig?.data)} messageConfig.data.flags=${_safeKeys(messageConfig?.data?.flags)}`
        );

        // Same dnd5e 6.0 issue as processRoll above: preUseActivity's messageConfig.data has no
        // `flags` key yet (it's added later in _createUsageMessage). Guard before assigning into it.
        messageConfig.data ??= {};
        messageConfig.data.flags ??= {};
        if (!messageConfig.data.flags) {
            LogUtility.logWarning(`[RM DEBUG] processActivity: messageConfig.data.flags was missing, had to create it. This is the dnd5e 6.0 breakage.`, { ui: false });
        }

        const keys = {
            normal: CoreUtility.areKeysPressed(usageConfig.event, "skipDialogNormal"),
            advantage: CoreUtility.areKeysPressed(usageConfig.event, "skipDialogAdvantage"),
            disadvantage: CoreUtility.areKeysPressed(usageConfig.event, "skipDialogDisadvantage"),
        };

        const versatile = CoreUtility.areModuleKeysPressed(usageConfig.event, "rollVersatile");

        const fastForward = !(keys.normal || (usageConfig.vanilla ?? false));

        // dnd5e 6.0's Activity#use fires the activity's primary action itself after the usage
        // card is created (_triggerSubsequentActions → an attack roll with no rm flags, so it
        // isn't fast-forwarded and pops the vanilla roll dialog). roll-model rolls attack and
        // damage on its own from the rendered card (runActivityActions), so opt out here. This
        // is the supported switch — returning false from dnd5e.postUseActivity also works but
        // short-circuits every other module's postUseActivity handler, which is why that used
        // to be registered on a 15s timer, leaving the first attack after a reload unguarded.
        usageConfig.subsequentActions = false;

        dialogConfig.configure =
            usageConfig.hasOwnProperty("spell") ||
            (usageConfig.scaling !== undefined && usageConfig.scaling !== false) ||
            messageConfig.data?.flags?.dnd5e?.activity?.type === "order" ||
            !fastForward;

        messageConfig.data.flags[MODULE_SHORT] = {
            quickRoll: fastForward,
            advantage: keys.advantage,
            disadvantage: keys.disadvantage,
            versatile: versatile,
            processed: !fastForward,
        };

        LogUtility.log(
            `[RM DEBUG] processActivity EXIT dialogConfig.configure=${dialogConfig.configure} flags=${JSON.stringify(messageConfig.data.flags[MODULE_SHORT])}`
        );
    }

    /**
     * Checks if the roll needs to be forced to multi roll and returns the updated roll if needed.
     * @param {Roll} roll The roll to check.
     * @returns {Promise<Roll>} The version of the roll with multi roll enforced if needed, or the original roll otherwise.
     */
    static async ensureMultiRoll(roll) {
        if (!roll) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.rollIsNullOrUndefined`));
            return null;
        }

        if (!(roll.hasAdvantage || roll.hasDisadvantage)) {
            const forcedDiceCount = roll.options.elvenAccuracy ? 3 : 2;
            const d20BaseTerm = roll.terms.find((d) => d.faces === 20);
            const d20Additional = await new Roll(`${forcedDiceCount - d20BaseTerm.number}d20${d20BaseTerm.modifiers.join("")}`).evaluate();

            // Preserve the die's class and options: dnd5e's D20Die#isCriticalSuccess/Failure read
            // criticalSuccess/criticalFailure off the *term* options (copied there by
            // D20Roll#configureModifiers). Rebuilding as a bare Die with no options silently turned
            // a natural 20 into a non-crit after a retroactive adv/dis upgrade.
            const DieClass = d20BaseTerm.constructor;
            const d20Forced = new DieClass({
                number: forcedDiceCount,
                faces: 20,
                results: [...d20BaseTerm.results, ...d20Additional.dice[0].results],
                modifiers: d20BaseTerm.modifiers,
                options: {
                    ...foundry.utils.deepClone(d20BaseTerm.options ?? {}),
                    criticalSuccess: d20BaseTerm.options?.criticalSuccess ?? roll.options.criticalSuccess,
                    criticalFailure: d20BaseTerm.options?.criticalFailure ?? roll.options.criticalFailure,
                },
            });

            roll.terms[roll.terms.indexOf(d20BaseTerm)] = d20Forced;

            RollUtility.resetRollGetters(roll);
        }

        return roll;
    }

    /**
     * Upgrades a roll into a multi roll with the given target state (advantage/disadvantage).
     * @param {Roll} roll The roll to upgrade.
     * @param {ROLL_STATE} targetState The target state of the roll.
     * @returns {Promise<Roll>} The upgraded multi roll from the provided roll.
     */
    static async upgradeRoll(roll, targetState) {
        if (!roll) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.rollIsNullOrUndefined`));
            return null;
        }

        if (targetState !== ROLL_STATE.ADV && targetState !== ROLL_STATE.DIS) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectTargetState`, { state: targetState }));
            return roll;
        }

        if (targetState === ROLL_STATE.DIS) {
            roll.options.elvenAccuracy = false;
        }

        const upgradedRoll = await RollUtility.ensureMultiRoll(roll);

        const d20BaseTerm = upgradedRoll.terms.find((d) => d.faces === 20);

        // Crit thresholds live on the die term (see D20Roll#configureModifiers); make sure they are
        // present so isCritical/isFumble keep working after the upgrade.
        d20BaseTerm.options ??= {};
        d20BaseTerm.options.criticalSuccess ??= upgradedRoll.options.criticalSuccess;
        d20BaseTerm.options.criticalFailure ??= upgradedRoll.options.criticalFailure;

        // Re-applicable: drop any previous keep modifier and un-discard every die so switching
        // between advantage and disadvantage on an already-upgraded roll re-evaluates cleanly
        // instead of stacking "kh" + "kl". dnd5e 6.0's D20Die tags the die with "adv"/"dis"
        // modifiers instead (D20Die#applyAdvantage) — strip those as well, or the formula reads
        // "2d20diskh" with both modifiers applied.
        d20BaseTerm.modifiers = d20BaseTerm.modifiers.filter((m) => !RollUtility._isAdvantageModifier(m));
        for (const result of d20BaseTerm.results) {
            result.active = true;
            delete result.discarded;
        }

        d20BaseTerm.keep(targetState);
        d20BaseTerm.modifiers.push(targetState);

        upgradedRoll.options.advantageMode =
            targetState === ROLL_STATE.ADV ? CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE : CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;
        // The die term carries its own copy of the mode in 6.0.
        d20BaseTerm.options.advantageMode = upgradedRoll.options.advantageMode;

        RollUtility.resetRollGetters(upgradedRoll);
        return upgradedRoll;
    }

    /**
     * Reverts an advantage/disadvantage roll back to a normal single-d20 roll, keeping the die that
     * was rolled first (ensureMultiRoll appends the extra die after the original one).
     * @param {Roll} roll The roll to downgrade.
     * @returns {Roll} The same roll, now a normal roll.
     */
    static downgradeRoll(roll) {
        if (!roll) return roll;
        const d20BaseTerm = roll.terms.find((d) => d.faces === 20);
        if (!d20BaseTerm) return roll;

        const first = d20BaseTerm.results[0];
        if (first) {
            first.active = true;
            delete first.discarded;
        }

        const DieClass = d20BaseTerm.constructor;
        roll.terms[roll.terms.indexOf(d20BaseTerm)] = new DieClass({
            number: 1,
            faces: 20,
            results: first ? [first] : [],
            modifiers: d20BaseTerm.modifiers.filter((m) => !RollUtility._isAdvantageModifier(m)),
            options: { ...foundry.utils.deepClone(d20BaseTerm.options ?? {}), advantageMode: CONFIG.Dice.D20Roll.ADV_MODE.NORMAL },
        });

        roll.options.advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.NORMAL;
        roll.options.advantage = false;
        roll.options.disadvantage = false;
        RollUtility.resetRollGetters(roll);
        return roll;
    }

    /** kh/kl (core keep modifiers) and adv/adv2/dis (dnd5e 6.0 D20Die modifiers). */
    static _isAdvantageModifier(m) {
        return m === ROLL_STATE.ADV || m === ROLL_STATE.DIS || m.startsWith("adv") || m.startsWith("dis");
    }

    static resetRollGetters(roll) {
        roll._total = roll._evaluateTotal();
        roll.resetFormula();
    }

    static captureFormulaParts(rollConfig) {
        if (!rollConfig?.parts?.length) return;

        const data = rollConfig.data ?? {};
        rollConfig.options ??= {};
        rollConfig.options.bonusParts = rollConfig.parts;
        rollConfig.options.bonusSourceLabels ??= [];
        rollConfig.options.bonusData = Object.fromEntries(
            rollConfig.parts
                .filter((p) => p.startsWith("@"))
                .map((p) => [p.slice(1), foundry.utils.getProperty(data, p.slice(1))])
                .filter(([, v]) => v !== undefined),
        );
        rollConfig.options.bonusResolved = rollConfig.parts.map((part) => RollUtility.resolveFormulaPart(part, data));
        rollConfig.options.bonusLabels = rollConfig.parts.map((part, i) => rollConfig.options.bonusSourceLabels[i] ?? _getFormulaPartLabel(part, data));
    }

    static captureAttackFormulaParts(outerConfig, rollConfig, index = 0) {
        RollUtility.captureFormulaParts(rollConfig);
        if (!rollConfig?.parts?.length) return;

        rollConfig.options ??= {};
        rollConfig.options.bonusTermLabels = _buildAttackTermLabels(outerConfig, rollConfig);
    }

    static captureSaveFormulaParts(outerConfig, rollConfig, index = 0) {
        RollUtility.captureFormulaParts(rollConfig);
        if (!rollConfig?.parts?.length) return;

        rollConfig.options ??= {};
        rollConfig.options.bonusTermLabels = _buildSaveTermLabels(outerConfig, rollConfig);
    }

    static captureCheckFormulaParts(outerConfig, rollConfig, index = 0) {
        RollUtility.captureFormulaParts(rollConfig);
        if (!rollConfig?.parts?.length) return;

        rollConfig.options ??= {};
        rollConfig.options.bonusTermLabels = _buildCheckTermLabels(outerConfig, rollConfig);
    }

    static captureDamageFormulaParts(outerConfig, rollConfig, index = 0) {
        if (!rollConfig?.parts?.length) return;

        rollConfig.options ??= {};
        const existingLabels = rollConfig.options.bonusSourceLabels ?? [];
        const derivedLabels = _buildDamageSourceLabels(outerConfig, rollConfig, index);
        rollConfig.options.bonusSourceLabels = rollConfig.parts.map((_, i) => derivedLabels[i] ?? existingLabels[i]);
        RollUtility.captureFormulaParts(rollConfig);
        rollConfig.options.damageTermLabels = _buildDamageTermLabels(outerConfig, rollConfig, index);
    }

    static getCelestialShroudEffect(actor) {
        if (!actor) return null;

        const raceItem = actor.items?.find((i) => i.type === "race");
        const raceName =
            raceItem?.name ?? actor.system?.details?.race?.name ?? (typeof actor.system?.details?.race === "string" ? actor.system.details.race : "");

        if (!_normalizeIdentifier(raceName).includes("aasimar")) return null;

        const EFFECT_TYPES = {
            "necrotic shroud (self)": "necrotic",
            "inner radiance": "radiant",
            "heavenly wings": "radiant",
        };

        for (const effect of actor.appliedEffects ?? []) {
            const key = Object.keys(EFFECT_TYPES).find((k) => effect.name.toLowerCase().trim() === k);
            if (key) return { damageType: EFFECT_TYPES[key], effectName: effect.name };
        }

        return null;
    }

    static applyGWMDamageBonus(outerConfig, rollConfig, index) {
        if (index !== 0) return false;

        const subject = outerConfig?.subject ?? rollConfig?.subject;
        if (!_isGWMEligible(subject)) return false;

        const profBonus = RollUtility.resolveFormulaPart("@prof", rollConfig.data ?? {});
        const prof = Number(profBonus);
        if (!prof || isNaN(prof)) return false;

        const gwmPartIndex = rollConfig.parts.length;
        rollConfig.parts.push("@prof");
        rollConfig.options ??= {};
        rollConfig.options.gwmBonus = prof;
        rollConfig.options.bonusSourceLabels ??= [];
        rollConfig.options.bonusSourceLabels[gwmPartIndex] = "GWM";

        return true;
    }

    static injectLunarRadianceType(outerConfig, rollConfig) {
        const subject = outerConfig?.subject ?? rollConfig?.subject;
        if (!_isLunarRadianceEligible(subject)) return false;

        rollConfig.options ??= {};
        const existing = Array.isArray(rollConfig.options.types) ? rollConfig.options.types : rollConfig.options.type ? [rollConfig.options.type] : [];

        if (existing.includes("radiant")) return false;

        rollConfig.options.types = [...existing, "radiant"];
        return true;
    }

    /**
     * Strips the actor's heal damage bonus (system.bonuses.heal.damage) from non-spell
     * heal activities.  The bonus is intended for healing spells only — pool-based
     * features like Lay on Hands should not benefit from it.
     * @param {Object} outerConfig The outer roll configuration object.
     * @param {Object} rollConfig  The individual roll configuration.
     */
    static stripNonSpellHealBonus(outerConfig, rollConfig) {
        const subject = outerConfig?.subject ?? rollConfig?.subject;
        if (!subject) return;

        // Only applies to heal-type activities on non-spell items
        if (subject.type !== "heal") return;
        if (subject.item?.type === "spell") return;

        const actor = subject.actor;
        if (!actor) return;

        const healBonus = foundry.utils.getProperty(actor, "system.bonuses.heal.damage");
        if (!healBonus) return;

        const parts = rollConfig.parts;
        if (!parts?.length) return;

        const healBonusNormalized = String(healBonus).trim();
        rollConfig.parts = parts.filter((p) => {
            const part = String(p).trim();
            return part !== healBonusNormalized && part !== "@bonuses.heal.damage";
        });
    }

    static applyElementalFuryPotentSpellcastingDamageBonus(outerConfig, rollConfig, index) {
        if (index !== 0) return false;

        const subject = outerConfig?.subject ?? rollConfig?.subject;
        if (!_isElementalFuryPotentSpellcastingEligible(subject)) return false;

        const wisMod = _getWisdomModifier(subject?.actor, rollConfig.data);
        if (!wisMod || isNaN(wisMod)) return false;

        const partIndex = rollConfig.parts.length;
        rollConfig.parts.push(String(wisMod));
        rollConfig.options ??= {};
        rollConfig.options.elementalFuryPotentSpellcastingBonus = wisMod;
        rollConfig.options.bonusSourceLabels ??= [];
        rollConfig.options.bonusSourceLabels[partIndex] = "Elemental Fury: Potent Spellcasting";

        return true;
    }

    static captureDamageRollSources(rolls, config) {
        if (!rolls?.length || !config?.rolls?.length) return;

        for (let i = 0; i < rolls.length; i++) {
            const roll = rolls[i];
            const rollConfig = config.rolls[i];
            if (!roll || !rollConfig) continue;

            RollUtility.captureDamageFormulaParts(config, rollConfig, i);
            roll.options ??= {};
            roll.options.bonusParts = rollConfig.options?.bonusParts;
            roll.options.bonusData = rollConfig.options?.bonusData;
            roll.options.bonusResolved = rollConfig.options?.bonusResolved;
            roll.options.bonusLabels = rollConfig.options?.bonusLabels;
            roll.options.bonusSourceLabels = rollConfig.options?.bonusSourceLabels;
            roll.options.damageTermLabels = rollConfig.options?.damageTermLabels;
        }
    }

    static resolveFormulaPart(part, data) {
        if (part.startsWith("@")) {
            const v = foundry.utils.getProperty(data, part.slice(1));
            if (v === undefined) return null;
            const num = Number(v);
            if (!isNaN(num)) return num;
            if (typeof v === "string") {
                try {
                    return Roll.safeEval(v);
                } catch {
                    return null;
                }
            }
            return null;
        }

        const num = Number(part);
        if (!isNaN(num)) return num;
        try {
            return Roll.safeEval(Roll.replaceFormulaData(part, data));
        } catch {
            return null;
        }
    }

    /**
     * Builds an annotated formula string where each @-variable bonus is followed by its name in parentheses.
     * Falls back to null if no bonus parts are stored on the roll.
     * @param {Roll} roll The evaluated D20Roll.
     * @returns {string|null}
     */
    static buildLabeledFormula(roll) {
        const bonuses = RollUtility.buildLabeledBonuses(roll);
        if (!bonuses) return null;

        const d20Term = roll.terms.find((t) => t.faces === 20);
        const base = d20Term ? d20Term.expression : "1d20";

        const bonusStr = bonuses
            .map(({ value, label }) => `${value >= 0 ? "+" : ""}${value}${label ? ` (${label})` : ""}`)
            .join(" ");

        return bonusStr ? `${base} ${bonusStr}` : null;
    }

    /**
     * Structured form of buildLabeledFormula: every non-d20 term of a D20Roll as a signed value with
     * the display label of the source it came from (null when unknown). Zero-valued terms are skipped.
     * @param {Roll} roll The evaluated D20Roll.
     * @returns {{value: number, label: string|null}[]|null}
     */
    static buildLabeledBonuses(roll) {
        if (!roll) return null;

        const parts = roll.options?.bonusParts;
        const resolved = roll.options?.bonusResolved;
        const labels = roll.options?.bonusLabels;
        const termLabels = roll.options?.bonusTermLabels;

        if (!parts?.length) return null;

        // Map resolved value → queued display labels (skip zeros — they don't appear in the formula)
        // bonusLabels holds the formula string for expression-valued parts (e.g. "max(1, 6)")
        // and the plain key name for numeric parts (e.g. "prof")
        const labelQueue = new Map();
        for (let i = 0; i < parts.length; i++) {
            const label = labels?.[i];
            if (!label) continue;

            const value = resolved?.[i];
            if (value === null || value === undefined) continue;

            const num = Number(value);
            if (isNaN(num) || num === 0) continue;
            if (!labelQueue.has(num)) labelQueue.set(num, []);
            labelQueue.get(num).push(_getFormulaDisplayLabel(label));
        }

        // Walk roll.terms, pairing each value term with its preceding operator
        const segments = [];
        let pendingOp = "+";
        for (const term of roll.terms) {
            if (term instanceof foundry.dice.terms.Die && term.faces === 20) {
                pendingOp = "+";
                continue;
            }
            if (term instanceof foundry.dice.terms.OperatorTerm) {
                pendingOp = term.operator;
                continue;
            }
            segments.push({ term, op: pendingOp });
            pendingOp = "+";
        }

        let termLabelIdx = 0;
        return segments
            .map(({ term, op }) => {
                const absVal = Number(term.total);
                if (isNaN(absVal) || absVal === 0) return null;
                const signedVal = op === "-" ? -absVal : absVal;

                // Consume termLabels in order rather than by segment index — this handles
                // cases where a single @-variable expands to multiple roll terms (e.g. @saveBonus = "2 + 2").
                const termLabel = termLabels?.[termLabelIdx];
                if (termLabel && (termLabel.value === undefined || termLabel.value === signedVal)) {
                    termLabelIdx++;
                    return { value: signedVal, label: _getFormulaDisplayLabel(termLabel.label) };
                }

                const labels = labelQueue.get(signedVal);
                if (labels?.length) return { value: signedVal, label: labels.shift() };
                return { value: signedVal, label: null };
            })
            .filter(Boolean);
    }

    /**
     * Builds an annotated damage formula, preserving normal damage dice while labelling damage type
     * and any captured @-variable bonuses.
     * @param {Roll} roll The evaluated DamageRoll.
     * @returns {string|null}
     */
    static buildLabeledDamageFormula(roll) {
        const segments = RollUtility.buildLabeledDamageSegments(roll);
        if (!segments?.length) return null;

        return segments
            .map(({ op, expression, label }, i) => {
                const sign = i === 0 && op === "+" ? "" : `${op} `;
                return `${sign}${expression}${label ? ` (${label})` : ""}`;
            })
            .join(" ");
    }

    /**
     * Structured form of buildLabeledDamageFormula: one entry per non-zero term of a DamageRoll.
     * @param {Roll} roll The evaluated DamageRoll.
     * @returns {{op: string, expression: string, label: string|null, isDie: boolean, value: number, term: object}[]|null}
     */
    static buildLabeledDamageSegments(roll) {
        if (!roll) return null;

        const labels = _buildFormulaLabelQueue(roll);
        const orderedLabels = _buildOrderedFormulaLabels(roll);
        const termLabels = roll.options?.damageTermLabels ?? [];
        const segments = [];
        let pendingOp = "+";
        let bonusIndex = 0;
        let termIndex = 0;
        let damageTermLabelIndex = 0;

        for (const term of roll.terms) {
            if (term instanceof foundry.dice.terms.OperatorTerm) {
                pendingOp = term.operator;
                continue;
            }

            const expression = _getTermExpression(term);
            if (!expression) continue;

            const value = Number(term.total);
            const signedValue = pendingOp === "-" ? -value : value;
            if (!(term instanceof foundry.dice.terms.Die) && !isNaN(value) && value === 0) {
                bonusIndex = _consumeOrderedFormulaLabel(orderedLabels, bonusIndex, signedValue).nextIndex;
                termIndex++;
                pendingOp = "+";
                continue;
            }

            const displayExpression = _getDamageTermDisplayExpression(term);
            const orderedLabel = _consumeOrderedFormulaLabel(orderedLabels, bonusIndex, signedValue);
            bonusIndex = orderedLabel.nextIndex;
            const termLabel = _consumeMatchingDamageTermLabel(termLabels, damageTermLabelIndex, termIndex, signedValue);
            damageTermLabelIndex = termLabel.nextIndex;
            const label =
                term instanceof foundry.dice.terms.Die
                    ? orderedLabel.label
                    : (termLabel.label ??
                      orderedLabel.label ??
                      _getExpressionLabel(expression, displayExpression) ??
                      (orderedLabel.matched ? null : _getDamageTermLabel(term, labels, pendingOp)));
            segments.push({
                op: pendingOp,
                expression: displayExpression,
                label: label ?? null,
                isDie: term instanceof foundry.dice.terms.Die,
                value: signedValue,
                term,
            });
            termIndex++;
            pendingOp = "+";
        }

        return segments;
    }

    /**
     * Processes a set of dice results to check what type of critical was rolled (for showing colour in chat card).
     * @param {Die} die A die term to process into a crit type.
     * @param {Number} options.critThreshold The threshold above which a result is considered a crit.
     * @param {Number} options.fumbleThreshold The threshold below which a result is considered a crit.
     * @returns {CRIT_TYPE} The type of crit for the die term.
     */
    static getCritTypeForDie(die, options = {}) {
        if (!die) return null;

        const { crit, fumble } = _countCritsFumbles(die, options);

        return _getCritResult(crit, fumble);
    }
}

function _safeKeys(obj) {
    if (obj === undefined) return "undefined";
    if (obj === null) return "null";
    try {
        return `{${Object.keys(obj).join(",")}}`;
    } catch {
        return String(obj);
    }
}

function _getCritResult(crit, fumble) {
    if (crit > 0 && fumble > 0) {
        return CRIT_TYPE.MIXED;
    }

    if (crit > 0) {
        return CRIT_TYPE.SUCCESS;
    }

    if (fumble > 0) {
        return CRIT_TYPE.FAILURE;
    }
}

function _countCritsFumbles(die, options) {
    let crit = 0;
    let fumble = 0;

    if (die && die.faces > 1) {
        let { critThreshold, fumbleThreshold, target, ignoreDiscarded, displayChallenge, forceSuccess } = options;

        if (forceSuccess) {
            return { crit: 1, fumble: 0 };
        }

        critThreshold = critThreshold ?? die.options.criticalSuccess ?? die.faces;
        fumbleThreshold = fumbleThreshold ?? die.options.criticalFailure ?? 1;

        for (const result of die.results) {
            if (result.rerolled || (result.discarded && ignoreDiscarded)) {
                continue;
            }

            if ((displayChallenge && result.result >= target) || result.result >= critThreshold) {
                crit += 1;
            } else if ((displayChallenge && result.result < target) || result.result <= fumbleThreshold) {
                fumble += 1;
            }
        }
    }

    return { crit, fumble };
}

function _buildFormulaLabelQueue(roll) {
    const parts = roll.options?.bonusParts;
    const resolved = roll.options?.bonusResolved;
    const labels = roll.options?.bonusLabels;
    const labelQueue = new Map();

    if (!parts?.length) return labelQueue;

    for (let i = 0; i < parts.length; i++) {
        const label = labels?.[i];
        if (!label) continue;

        const value = resolved?.[i];
        if (value === null || value === undefined) continue;

        const num = Number(value);
        if (isNaN(num) || num === 0) continue;
        if (!labelQueue.has(num)) labelQueue.set(num, []);
        labelQueue.get(num).push(_getFormulaDisplayLabel(label));
    }

    return labelQueue;
}

function _getDamageTermLabel(term, labels, operator = "+") {
    const value = Number(term.total);
    if (isNaN(value) || value === 0) return null;
    const signedValue = operator === "-" ? -value : value;
    return labels.get(signedValue)?.shift() ?? null;
}

function _getMatchingTermLabel(termLabel, value) {
    if (!termLabel) return null;
    if (termLabel.value === undefined || termLabel.value === null || isNaN(Number(termLabel.value)) || Number(termLabel.value) === Number(value)) return termLabel.label;
    return null;
}

function _consumeMatchingDamageTermLabel(labels, index, preferredIndex, value) {
    const preferred = labels?.[preferredIndex];
    const preferredLabel = _getMatchingTermLabel(preferred, value);
    if (preferredLabel) return { label: preferredLabel, nextIndex: Math.max(index, preferredIndex + 1) };

    for (let i = index; i < (labels?.length ?? 0); i++) {
        const label = _getMatchingTermLabel(labels[i], value);
        if (label) return { label, nextIndex: i + 1 };
    }

    return { label: null, nextIndex: index };
}

function _getTermExpression(term) {
    if (term instanceof foundry.dice.terms.Die) return (term.expression ?? term.formula ?? "").replace(/\[[^\]]+\]$/u, "");
    if (_isFoundryTerm(term, "NumericTerm")) return String(term.number);
    if (_isFoundryTerm(term, "StringTerm")) return term.term;
    if (_isFoundryTerm(term, "ParentheticalTerm")) return `(${term.term})`;
    return term.expression ?? term.formula ?? String(term.total ?? "");
}

function _isFoundryTerm(term, className) {
    const cls = foundry.dice.terms[className];
    return cls ? term instanceof cls : false;
}

function _getFormulaPartLabel(part, data) {
    if (_isDiceFormula(part)) return null;

    const variable = part.match(/@[\w.-]+/u)?.[0]?.slice(1);
    if (!variable) return isNaN(Number(part)) ? part : null;

    const v = foundry.utils.getProperty(data, variable);
    return typeof v === "string" && isNaN(Number(v)) ? v : variable;
}

function _getFormulaDisplayLabel(label) {
    if (!label) return label;
    return FORMULA_LABEL_ALIASES[label] ?? label;
}

function _buildOrderedFormulaLabels(roll) {
    const parts = roll.options?.bonusParts;
    const resolved = roll.options?.bonusResolved;
    const labels = roll.options?.bonusLabels;

    if (!parts?.length) return [];

    return parts.map((part, i) => {
        const value = resolved?.[i];
        return {
            index: i,
            label: _getFormulaDisplayLabel(labels?.[i]),
            value: value === null || value === undefined ? NaN : Number(value),
        };
    });
}

function _consumeOrderedFormulaLabel(parts, index, value) {
    for (let i = index; i < parts.length; i++) {
        const part = parts[i];
        if (!isNaN(part.value) && !isNaN(value) && part.value !== value) continue;
        return { label: part.label ?? null, matched: true, nextIndex: i + 1 };
    }

    return { label: null, matched: false, nextIndex: index };
}

function _getDamageTermDisplayExpression(term) {
    if (term instanceof foundry.dice.terms.Die) return _getTermExpression(term);

    const expression = _getTermExpression(term);
    const value = Number(term.total);
    if (!expression || isNaN(value) || expression === String(value)) return expression;

    return String(value);
}

function _getExpressionLabel(expression, displayExpression) {
    if (!expression || expression === displayExpression || !isNaN(Number(expression))) return null;
    return expression;
}

function _buildDamageSourceLabels(outerConfig, rollConfig, index) {
    const labels = [];
    const subject = _getRollSubject(outerConfig, rollConfig);
    if (!subject) return labels;

    const actionType = _getRollActionType(subject, outerConfig);
    const actorBonusPath = actionType ? `system.bonuses.${actionType}.damage` : null;
    const actorBonus = actorBonusPath ? foundry.utils.getProperty(subject.actor ?? {}, actorBonusPath) : null;
    const itemDamageBonus = subject.item?.system?.damageBonus;
    const damagePart = subject.damage?.parts?.[index];
    const enchantmentLabel = _getEnchantmentDamagePartLabel(subject.item, damagePart, rollConfig.parts[0], rollConfig.data);

    if (enchantmentLabel) labels[0] = enchantmentLabel;
    if (index !== 0) return labels;

    let actorBonusMatched = false;
    let itemBonusMatched = false;
    const rollData = rollConfig.data ?? subject.getRollData?.() ?? {};

    for (let i = 0; i < rollConfig.parts.length; i++) {
        const part = rollConfig.parts[i];
        if (_isFormulaDataReference(part)) continue;

        if (!actorBonusMatched && actorBonus && _formulaMatchesPart(actorBonus, part, rollData)) {
            labels[i] = _getActorBonusSourceLabel(subject.actor, actorBonusPath, actorBonus, rollData);
            actorBonusMatched = true;
            continue;
        }

        if (!itemBonusMatched && itemDamageBonus && _formulaMatchesPart(String(itemDamageBonus), part, rollData)) {
            labels[i] = "item.damageBonus";
            itemBonusMatched = true;
        }
    }

    return labels;
}

function _buildDamageTermLabels(outerConfig, rollConfig, index) {
    const labels = [];
    const subject = _getRollSubject(outerConfig, rollConfig);
    if (!subject || index !== 0) return labels;

    const rollData = rollConfig.data ?? subject.getRollData?.() ?? {};
    const damagePart = subject.damage?.parts?.[index];

    const actionType = _getRollActionType(subject, outerConfig);
    const actorBonusPath = actionType ? `system.bonuses.${actionType}.damage` : null;
    const actorBonus = actorBonusPath ? foundry.utils.getProperty(subject.actor ?? {}, actorBonusPath) : null;
    const actorBonusQueue = actorBonusPath ? _getActiveEffectValueLabelsForChange(subject?.actor, actorBonusPath, rollData) : [];

    let termIndex = 0;

    for (const part of rollConfig.parts ?? []) {
        const isActorBonusPart = !!actorBonus && _formulaMatchesPart(actorBonus, part, rollData);
        const formulaRoll = Roll.create(String(part));
        for (const term of formulaRoll.terms) {
            if (term instanceof foundry.dice.terms.OperatorTerm) continue;

            const expression = _getTermExpression(term);
            const sourceFormula = _getDamageTermSourceFormula(part, term, damagePart) ?? expression;
            const value = RollUtility.resolveFormulaPart(sourceFormula, rollData);
            let label = _getItemDamageBonusSourceLabel(subject, sourceFormula, value, rollData, damagePart);

            if (!label && isActorBonusPart && !isNaN(Number(value)) && Number(value) !== 0) {
                const effectLabel = _consumeEffectLabel(actorBonusQueue, Number(value));
                if (effectLabel) label = effectLabel;
            }

            if (label) labels[termIndex] = { value: sourceFormula === expression ? Number(value) : NaN, label: _getFormulaDisplayLabel(label) };
            termIndex++;
        }
    }

    return labels;
}

function _buildAttackTermLabels(outerConfig, rollConfig) {
    const labels = [];
    const subject = _getRollSubject(outerConfig, rollConfig);
    const actionType = _getRollActionType(subject, outerConfig);
    const actorBonusPath = actionType ? `system.bonuses.${actionType}.attack` : null;
    const actorBonusEffects = actorBonusPath ? _getActiveEffectValueLabelsForChange(subject?.actor, actorBonusPath, rollConfig.data) : [];
    const actorBonusQueue = [...actorBonusEffects];

    for (let i = 0; i < rollConfig.parts.length; i++) {
        const part = rollConfig.parts[i];
        const value = rollConfig.options?.bonusResolved?.[i];
        if (value === null || value === undefined) continue;

        const variable = _getFormulaVariable(part);
        // dnd5e 6.0 packs effect-driven attack bonuses into "@ruleBonus" (e.g. "1 + 2"); pre-6.0
        // exposed them as "@actorBonus". Expand either into one label per contributing effect.
        if (variable === "actorBonus" || variable === "ruleBonus") {
            labels.push(..._buildExpandedFormulaTermLabels(foundry.utils.getProperty(rollConfig.data ?? {}, variable) ?? value, actorBonusQueue));
            continue;
        }

        if (variable === "bonus") {
            const itemBonusLabel = _getItemAttackBonusSourceLabel(subject, part, rollConfig.data);
            const num = Number(value);
            if (itemBonusLabel && !isNaN(num) && num !== 0) {
                labels.push({ value: num, label: _getFormulaDisplayLabel(itemBonusLabel) });
                continue;
            }

            const scopedBonusQueue = _getScopedBonusEffectValueLabels(subject?.actor, rollConfig.data, "attack");
            if (scopedBonusQueue.length) {
                labels.push(..._buildExpandedFormulaTermLabels(foundry.utils.getProperty(rollConfig.data ?? {}, variable) ?? value, scopedBonusQueue));
                continue;
            }
        }

        const label = _getItemAttackBonusSourceLabel(subject, part, rollConfig.data) ?? rollConfig.options?.bonusLabels?.[i];
        const num = Number(value);
        if (!isNaN(num) && num !== 0) labels.push({ value: num, label: _getFormulaDisplayLabel(label) });
    }

    return labels;
}

function _buildSaveTermLabels(outerConfig, rollConfig) {
    const labels = [];
    const subject = _getRollSubject(outerConfig, rollConfig);
    const actor = subject?.actor ?? subject;
    const ability = rollConfig?.ability ?? outerConfig?.ability;

    // Global save bonus path (system.bonuses.abilities.save)
    const globalSavePath = "system.bonuses.abilities.save";
    const globalSaveEffects = _getActiveEffectValueLabelsForChange(actor, globalSavePath, rollConfig.data);
    const globalSaveQueue = [...globalSaveEffects];

    // Per-ability save bonus path (e.g. system.abilities.dex.bonuses.save)
    const abilitySavePath = ability ? `system.abilities.${ability}.bonuses.save` : null;
    const abilitySaveEffects = abilitySavePath ? _getActiveEffectValueLabelsForChange(actor, abilitySavePath, rollConfig.data) : [];
    const abilitySaveQueue = [...abilitySaveEffects];

    for (let i = 0; i < rollConfig.parts.length; i++) {
        const part = rollConfig.parts[i];
        const value = rollConfig.options?.bonusResolved?.[i];
        if (value === null || value === undefined) continue;

        const variable = _getFormulaVariable(part);

        // Global save bonus — expand into per-effect labels ("@ruleBonus" is the 6.0 packing of the
        // same effect-driven bonuses; try the per-ability queue first, then the global one).
        if (variable === "saveBonus" || variable === "ruleBonus" || part === `@${ability}SaveBonus`) {
            const queue = variable === "saveBonus" ? globalSaveQueue : variable === "ruleBonus" ? [...abilitySaveQueue, ...globalSaveQueue] : abilitySaveQueue;
            labels.push(..._buildExpandedFormulaTermLabels(
                foundry.utils.getProperty(rollConfig.data ?? {}, variable) ?? value,
                queue
            ));
            continue;
        }

        const label = rollConfig.options?.bonusLabels?.[i];
        const num = Number(value);
        if (!isNaN(num) && num !== 0) labels.push({ value: num, label: _getFormulaDisplayLabel(label) });
    }

    return labels;
}

/**
 * Ability/skill/tool check term labels. dnd5e 6.0 builds these rolls from "@mod", "@prof",
 * "@extraBonus" and "@ruleBonus" (Actor5e#_buildSkillToolConfig / _buildAbilityCheckConfig), where
 * "@ruleBonus" packs every effect-driven bonus. Expand that one into one line per effect, matched
 * against the change keys such bonuses are written to (both the 6.0 roll-modification fields and
 * the pre-6.0 bonuses.* paths, which migrated effects may still use); the rest keep their part label.
 */
function _buildCheckTermLabels(outerConfig, rollConfig) {
    const labels = [];
    const subject = _getRollSubject(outerConfig, rollConfig);
    const actor = subject?.actor ?? subject;
    const ability = rollConfig?.data?.abilityId ?? rollConfig?.ability ?? outerConfig?.ability;
    const skill = outerConfig?.skill ?? rollConfig?.skill;
    const tool = outerConfig?.tool ?? rollConfig?.tool;
    const isInitiative = rollConfig?.data?.roll?.type === "initiative";

    const paths = [
        isInitiative ? "system.attributes.init.roll.bonus" : null,
        isInitiative ? "system.attributes.init.bonus" : null,
        ability ? `system.abilities.${ability}.check.roll.bonus` : null,
        ability ? `system.abilities.${ability}.bonuses.check` : null,
        skill ? `system.skills.${skill}.roll.bonus` : null,
        skill ? `system.skills.${skill}.bonuses.check` : null,
        tool ? `system.tools.${tool}.roll.bonus` : null,
        tool ? `system.tools.${tool}.bonuses.check` : null,
        skill ? "system.rolls.ability.skill.bonus" : null,
        skill ? "system.bonuses.abilities.skill" : null,
        tool ? "system.rolls.ability.tool.bonus" : null,
        "system.rolls.ability.check.bonus",
        "system.bonuses.abilities.check",
    ].filter(Boolean);
    const effectQueue = paths.flatMap((p) => _getActiveEffectValueLabelsForChange(actor, p, rollConfig.data));
    LogUtility.log(`[RM DEBUG] _buildCheckTermLabels ability=${ability} skill=${skill} tool=${tool} parts=${JSON.stringify(rollConfig.parts)} effectLabels=${JSON.stringify(effectQueue)}`);

    for (let i = 0; i < rollConfig.parts.length; i++) {
        const part = rollConfig.parts[i];
        const value = rollConfig.options?.bonusResolved?.[i];
        if (value === null || value === undefined) continue;

        const variable = _getFormulaVariable(part);
        if (variable === "ruleBonus" || variable === "checkBonus" || variable === "skillBonus" || variable === "toolBonus") {
            labels.push(..._buildExpandedFormulaTermLabels(foundry.utils.getProperty(rollConfig.data ?? {}, variable) ?? value, effectQueue));
            continue;
        }

        const label = rollConfig.options?.bonusLabels?.[i];
        const num = Number(value);
        if (!isNaN(num) && num !== 0) labels.push({ value: num, label: _getFormulaDisplayLabel(label) });
    }

    return labels;
}

function _buildExpandedFormulaTermLabels(formula, effectQueue) {
    const terms = [];
    const formulaRoll = Roll.create(String(formula));
    // Function/parenthetical terms (e.g. dnd5e's "max(0, 7 - 2)" rule bonuses) only have a total
    // once evaluated; plain numeric terms already do. Deterministic formulas evaluate synchronously,
    // and anything with dice in it just keeps whatever totals it has.
    try {
        formulaRoll.evaluateSync({ strict: false });
    } catch (e) {
        LogUtility.log(`[RM DEBUG] _buildExpandedFormulaTermLabels: could not evaluate "${formula}": ${e?.message}`);
    }
    let pendingOp = "+";

    for (const term of formulaRoll.terms) {
        if (term instanceof foundry.dice.terms.OperatorTerm) {
            pendingOp = term.operator;
            continue;
        }

        const value = Number(term.total);
        if (isNaN(value) || value === 0) continue;
        const signedValue = pendingOp === "-" ? -value : value;
        const label = _getFormulaDisplayLabel(_consumeEffectLabel(effectQueue, signedValue) ?? "actorBonus");
        terms.push({ value: signedValue, label });
        pendingOp = "+";
    }

    return terms;
}

function _consumeEffectLabel(effectQueue, value) {
    const index = effectQueue.findIndex((effect) => effect.value === value);
    if (index === -1) return null;
    return effectQueue.splice(index, 1)[0].label;
}

function _getActiveEffectValueLabelsForChange(actor, path, rollData) {
    const labels = [];
    const effects = _getActorEffects(actor);

    for (const effect of effects) {
        for (const change of effect.changes ?? []) {
            if (change.key !== path) continue;
            const value = RollUtility.resolveFormulaPart(String(change.value), rollData ?? {});
            const num = Number(value);
            if (isNaN(num) || num === 0) continue;
            labels.push({ value: num, label: effect.name ?? effect.label ?? change.key });
        }
    }

    return labels;
}

function _getScopedBonusEffectValueLabels(actor, rollData, rollKind) {
    const labels = [];
    const effects = _getActorEffects(actor);
    const keyPrefix = "flags.dnd5e-scoped-bonuses.";
    const kindToken = `.${rollKind}.`;

    for (const effect of effects) {
        for (const change of effect.changes ?? []) {
            if (!change.key?.startsWith(keyPrefix)) continue;
            if (!change.key.includes(kindToken)) continue;

            const value = RollUtility.resolveFormulaPart(String(change.value), rollData ?? {});
            const num = Number(value);
            if (isNaN(num) || num === 0) continue;
            labels.push({ value: num, label: effect.name ?? effect.label ?? change.key });
        }
    }

    return labels;
}

function _getItemAttackBonusSourceLabel(subject, formula, rollData) {
    const item = subject?.item;
    if (!item) return null;

    const labels = [];
    const effects = _getItemEffects(item);

    for (const effect of effects) {
        for (const change of effect.changes ?? []) {
            const attackBonusChange = _isActivityAttackBonusChange(change.key, subject);
            const matches = attackBonusChange ? _formulaMatchesPart(change.value, formula, rollData ?? {}) : false;
            if (!attackBonusChange) continue;
            if (!matches) continue;
            labels.push(_getEffectName(effect));
        }
    }

    return [...new Set(labels)].join(" + ") || null;
}

function _getItemDamageBonusSourceLabel(subject, formula, value, rollData, damagePart) {
    const item = subject?.item;
    if (!item) return null;

    const labels = [];
    for (const effect of _getItemEffects(item)) {
        for (const change of effect.changes ?? []) {
            const damageBonusChange = _isItemDamageBonusChange(change.key, damagePart);
            if (damageBonusChange) {
                const matches =
                    _formulaMatchesPart(change.value, formula, rollData ?? {}) || Number(_renderResolvedFormula(change.value, rollData)) === Number(value);
                if (matches) labels.push(_getEffectName(effect));
                continue;
            }

            // Also match bonus formulas stored inside enchantment damage-parts changes (e.g. Shillelagh max(1,@mod))
            if (change.key !== "system.damage.parts") continue;
            if (!(effect.type === "enchantment" || effect.flags?.dnd5e?.type === "enchantment")) continue;
            const parsed = _parseDamagePartsChange(change.value);
            if (!parsed?.bonus) continue;
            const bonusMatches =
                _formulaMatchesPart(parsed.bonus, formula, rollData ?? {}) || Number(_renderResolvedFormula(parsed.bonus, rollData)) === Number(value);
            if (bonusMatches) labels.push(_getEffectName(effect));
        }
    }

    return [...new Set(labels)].join(" + ") || null;
}

function _isItemDamageBonusChange(key, damagePart) {
    if (key === "system.damageBonus") return true;

    if (damagePart?.base) return key === "system.damage.base.bonus";
    if (damagePart?.versatile) return key === "system.damage.versatile.bonus";
    return key === "system.damage.base.bonus" || key === "system.damage.versatile.bonus";
}

function _getDamageTermSourceFormula(part, term, damagePart) {
    if (term instanceof foundry.dice.terms.Die) return null;

    const bonus = damagePart?.bonus;
    if (bonus && String(part).includes(String(bonus))) return String(bonus);

    const baseBonus = damagePart?.base ? damagePart?.bonus : null;
    if (baseBonus && String(part).includes(String(baseBonus))) return String(baseBonus);

    const versatileBonus = damagePart?.versatile ? damagePart?.bonus : null;
    if (versatileBonus && String(part).includes(String(versatileBonus))) return String(versatileBonus);

    return null;
}

function _renderResolvedFormula(formula, rollData) {
    const value = RollUtility.resolveFormulaPart(String(formula), rollData ?? {});
    return value === null || value === undefined || isNaN(Number(value)) ? "unresolved" : Number(value);
}

function _getEffectName(effect) {
    const name = effect?.name ?? effect?.label ?? effect?.id ?? "unknown";
    return name.match(/^shillelagh\b/iu) ? "modShillelagh" : name;
}

function _isActivityAttackBonusChange(key, subject) {
    if (key === "activities[attack].attack.bonus") return true;
    if (!key?.startsWith("system.activities.")) return false;

    const activityId = subject?.id ?? subject?._id;
    if (!activityId) return /\.attack\.bonus$/u.test(key);

    return key === `system.activities.${activityId}.attack.bonus`;
}

function _isFormulaDataReference(part) {
    return /^[-+]?@[\w.-]+$/u.test(part.trim());
}

function _formulaMatchesPart(formula, part, data) {
    const normalizedFormula = String(formula).trim();
    const normalizedPart = String(part).trim();
    if (normalizedFormula === normalizedPart) return true;

    const formulaValue = RollUtility.resolveFormulaPart(normalizedFormula, data);
    const partValue = RollUtility.resolveFormulaPart(normalizedPart, data);
    return formulaValue !== null && partValue !== null && Number(formulaValue) === Number(partValue);
}

function _getActorBonusSourceLabel(actor, path, formula, rollData) {
    const effectLabels = _getActiveEffectLabelsForChange(actor, path, formula, rollData);
    if (effectLabels.length) return effectLabels.join(" + ");
    return path;
}

function _getActiveEffectLabelsForChange(actor, path, formula, rollData) {
    const labels = [];
    const effects = _getActorEffects(actor);

    for (const effect of effects) {
        for (const change of effect.changes ?? []) {
            if (change.key !== path) continue;
            if (!_formulaMatchesPart(change.value, formula, rollData)) continue;
            labels.push(effect.name ?? effect.label ?? change.key);
        }
    }

    return [...new Set(labels)];
}

function _getActorEffects(actor) {
    const effects = new Set();
    for (const effect of actor?.effects ?? []) effects.add(effect);
    for (const effect of actor?.appliedEffects ?? []) effects.add(effect);

    try {
        for (const effect of actor?.allApplicableEffects?.() ?? []) effects.add(effect);
    } catch {
        // Some Foundry versions expose allApplicableEffects as a generator that may require prepared state.
    }

    return Array.from(effects);
}

function _getRollSubject(outerConfig, rollConfig) {
    return outerConfig?.subject ?? rollConfig?.subject;
}

function _getRollActionType(subject, outerConfig) {
    return subject?.getActionType?.(outerConfig?.attackMode) ?? subject?.actionType;
}

function _getFormulaVariable(part) {
    return part.match(/@[\w.-]+/u)?.[0]?.slice(1);
}

function _getEnchantmentDamagePartLabel(item, damagePart, formula, rollData) {
    if (!item) return null;

    const effect = _findEnchantmentEffectForDamagePart(item, damagePart, formula, rollData);
    if (effect) return effect.name ?? effect.label ?? "Enchantment";

    return damagePart?.enchantment ? "Enchantment" : null;
}

function _findEnchantmentEffectForDamagePart(item, damagePart, formula, rollData) {
    const effects = _getItemEffects(item);

    for (const effect of effects) {
        if (!(effect.type === "enchantment" || effect.flags?.dnd5e?.type === "enchantment")) continue;

        for (const change of effect.changes ?? []) {
            if (change.key !== "system.damage.parts") continue;
            const parsed = _parseDamagePartsChange(change.value);
            if (!parsed) continue;
            if (!_formulaMatchesPart(parsed.formula, damagePart.formula ?? formula, rollData)) continue;
            if (parsed.type && damagePart?.types?.size && !damagePart.types.has(parsed.type)) continue;
            return effect;
        }
    }
}

function _getItemEffects(item) {
    const effects = new Set();
    for (const effect of item?.effects ?? []) effects.add(effect);
    for (const effect of item?.appliedEffects ?? []) effects.add(effect);
    return Array.from(effects);
}

function _parseDamagePartsChange(value) {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (foundry.utils.getType(parsed) === "Object") {
            return {
                formula: parsed.custom?.enabled ? parsed.custom.formula : parsed.formula,
                type: parsed.types?.[0],
                bonus: parsed.bonus,
            };
        }

        return {
            formula: parsed?.[0]?.[0],
            type: parsed?.[0]?.[1],
        };
    } catch {
        return null;
    }
}

function _isDiceFormula(part) {
    return /(?:^|[^\w])\d*d\d+/iu.test(String(part));
}

function _isGWMEligible(subject) {
    const actor = subject?.actor;
    const item = subject?.item;
    if (!actor || !item) return false;

    const hasGWM = actor.items.some((i) => i.type === "feat" && i.name.toLowerCase() === "great weapon master");
    if (!hasGWM) return false;

    return item.system?.properties?.has("hvy") ?? false;
}

function _isElementalFuryPotentSpellcastingEligible(subject) {
    const actor = subject?.actor;
    const item = subject?.item;
    if (!actor || !item) return false;

    const hasElementalFury = actor.items.some((i) => i.type === "feat" && i.name.toLowerCase() === "elemental fury: potent spellcasting");
    if (hasElementalFury) return _isDruidCantrip(item);

    const hasPotentSpellcasting = actor.items.some((i) => i.type === "feat" && i.name.toLowerCase() === "potent spellcasting");
    if (hasPotentSpellcasting) return _isClericCantrip(item, actor);

    return false;
}

function _isDruidCantrip(item) {
    if (item.type !== "spell") return false;
    if (Number(item.system?.level) !== 0) return false;

    const slug = _normalizeIdentifier(item.name);
    if (slug === "magicstone" || slug === "shillelagh") return false;

    return _itemHasDruidSource(item);
}

function _isClericCantrip(item, actor) {
    if (item.type !== "spell") return false;
    if (Number(item.system?.level) !== 0) return false;

    const slug = _normalizeIdentifier(item.name);
    if (slug === "magicstone" || slug === "shillelagh") return false;

    return _itemHasClericSource(item);
}

// dnd5e 5.3 introduced `system.sourceItem` and deprecated the `system.sourceClass` getter.
// Feature-detect with `in` so we only touch the field the schema actually defines,
// avoiding the deprecation log on v14/5.3 while still working on v13/5.2.
// Flag-based fallbacks (`flags.dnd5e.sourceClass`) read the underlying flag object,
// not the deprecated getter, so they remain safe on both versions.
function _readSystemSpellSource(item) {
    const system = item.system;
    if (!system) return undefined;
    if ("sourceItem" in system) return system.sourceItem;
    const hasOwn = Object.prototype.hasOwnProperty.call(system, "sourceClass");
    return hasOwn ? system.sourceClass : undefined;
}

function _itemHasDruidSource(item) {
    const candidates = [
        item.system?.classIdentifier,
        _readSystemSpellSource(item),
        item.system?.class,
        item.system?.spellList,
        item.system?.source?.class,
        item.system?.source?.classes,
        item.system?.source?.list,
        item.flags?.dnd5e?.sourceClass,
        item.flags?.dnd5e?.spellClass,
        item.flags?.dnd5e?.spellList,
        item.flags?.dnd5e?.source?.class,
        item.flags?.dnd5e?.source?.classes,
        item.flags?.dnd5e?.source?.list,
    ];

    return candidates.some((value) => _containsDruidIdentifier(value));
}

function _itemHasClericSource(item) {
    const candidates = [
        item.system?.classIdentifier,
        _readSystemSpellSource(item),
        item.system?.class,
        item.system?.spellList,
        item.system?.source?.class,
        item.system?.source?.classes,
        item.system?.source?.list,
        item.flags?.dnd5e?.sourceClass,
        item.flags?.dnd5e?.spellClass,
        item.flags?.dnd5e?.spellList,
        item.flags?.dnd5e?.source?.class,
        item.flags?.dnd5e?.source?.classes,
        item.flags?.dnd5e?.source?.list,
    ];

    return candidates.some((value) => _containsClassIdentifier(value, "cleric"));
}

function _containsDruidIdentifier(value) {
    return _containsClassIdentifier(value, "druid");
}

function _containsClassIdentifier(value, classIdentifier) {
    if (!value) return false;
    if (value instanceof Set) return Array.from(value).some((v) => _containsClassIdentifier(v, classIdentifier));
    if (Array.isArray(value)) return value.some((v) => _containsClassIdentifier(v, classIdentifier));
    if (foundry.utils.getType(value) === "Object") return Object.values(value).some((v) => _containsClassIdentifier(v, classIdentifier));

    const text = String(value).toLowerCase().trim();
    const normalized = _normalizeIdentifier(text);
    return normalized === classIdentifier || text === `class:${classIdentifier}`;
}

function _getWisdomModifier(actor, rollData) {
    const dataMod = RollUtility.resolveFormulaPart("@abilities.wis.mod", rollData ?? {});
    const mod = dataMod ?? actor?.system?.abilities?.wis?.mod;
    return Number(mod);
}

function _isLunarRadianceEligible(subject) {
    const actor = subject?.actor;
    if (!actor) return false;

    const originalActorRef = actor.flags?.dnd5e?.originalActor;
    if (!originalActorRef) return false;

    const actorId = String(originalActorRef).startsWith("Actor.") ? String(originalActorRef).split(".")[1] : originalActorRef;
    const originalActor = game.actors?.get(actorId) ?? fromUuidSync?.(originalActorRef);
    if (!originalActor) return false;

    return originalActor.items.some((i) => i.type === "feat" && _normalizeIdentifier(i.name) === "improvedcircleforms");
}

function _normalizeIdentifier(value) {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]/gu, "");
}
