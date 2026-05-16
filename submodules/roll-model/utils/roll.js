import { MODULE_SHORT } from "../config/const.js";
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
        if (message.data.flags[MODULE_SHORT]?.processed) return;

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
    }

    static processActivity(usageConfig, dialogConfig, messageConfig) {
        const keys = {
            normal: CoreUtility.areKeysPressed(usageConfig.event, "skipDialogNormal"),
            advantage: CoreUtility.areKeysPressed(usageConfig.event, "skipDialogAdvantage"),
            disadvantage: CoreUtility.areKeysPressed(usageConfig.event, "skipDialogDisadvantage"),
        };

        const versatile = CoreUtility.areModuleKeysPressed(usageConfig.event, "rollVersatile");

        const fastForward = !(keys.normal || (usageConfig.vanilla ?? false));
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

            const d20Forced = new foundry.dice.terms.Die({
                number: forcedDiceCount,
                faces: 20,
                results: [...d20BaseTerm.results, ...d20Additional.dice[0].results],
                modifiers: d20BaseTerm.modifiers,
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
        d20BaseTerm.keep(targetState);
        d20BaseTerm.modifiers.push(targetState);

        upgradedRoll.options.advantageMode =
            targetState === ROLL_STATE.ADV ? CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE : CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;

        RollUtility.resetRollGetters(upgradedRoll);
        return upgradedRoll;
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
        if (!roll) return null;

        const parts = roll.options?.bonusParts;
        const resolved = roll.options?.bonusResolved;
        const labels = roll.options?.bonusLabels;
        const termLabels = roll.options?.bonusTermLabels;

        if (!parts?.length) return null;

        const d20Term = roll.terms.find((t) => t.faces === 20);
        const base = d20Term ? d20Term.expression : "1d20";

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

        const bonusStr = segments
            .map(({ term, op }, index) => {
                const absVal = Number(term.total);
                if (isNaN(absVal) || absVal === 0) return null;
                const signedVal = op === "-" ? -absVal : absVal;
                const sign = signedVal >= 0 ? "+" : "";

                const termLabel = termLabels?.[index];
                if (termLabel && (termLabel.value === undefined || termLabel.value === signedVal)) {
                    return `${sign}${signedVal} (${_getFormulaDisplayLabel(termLabel.label)})`;
                }

                const labels = labelQueue.get(signedVal);
                if (labels?.length) return `${sign}${signedVal} (${labels.shift()})`;
                return `${sign}${signedVal}`;
            })
            .filter(Boolean)
            .join(" ");

        return bonusStr ? `${base} ${bonusStr}` : null;
    }

    /**
     * Builds an annotated damage formula, preserving normal damage dice while labelling damage type
     * and any captured @-variable bonuses.
     * @param {Roll} roll The evaluated DamageRoll.
     * @returns {string|null}
     */
    static buildLabeledDamageFormula(roll) {
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
            const sign = segments.length === 0 && pendingOp === "+" ? "" : `${pendingOp} `;
            segments.push(`${sign}${displayExpression}${label ? ` (${label})` : ""}`);
            termIndex++;
            pendingOp = "+";
        }

        return segments.length ? segments.join(" ") : null;
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
        if (variable === "actorBonus") {
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

function _buildExpandedFormulaTermLabels(formula, effectQueue) {
    const terms = [];
    const formulaRoll = Roll.create(String(formula));
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

function _itemHasDruidSource(item) {
    const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
    // dnd5e 5.3 introduced sourceItem and deprecated the sourceClass getter.
    // Use `in` to probe without triggering the deprecation accessor.
    const systemSource = ("sourceItem" in (item.system ?? {}))
        ? item.system.sourceItem
        : (hasOwn(item.system, "sourceClass") ? item.system.sourceClass : undefined);
    const candidates = [
        item.system?.classIdentifier,
        systemSource,
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
    const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
    // dnd5e 5.3 introduced sourceItem and deprecated the sourceClass getter.
    // Use `in` to probe without triggering the deprecation accessor.
    const systemSource = ("sourceItem" in (item.system ?? {}))
        ? item.system.sourceItem
        : (hasOwn(item.system, "sourceClass") ? item.system.sourceClass : undefined);
    const candidates = [
        item.system?.classIdentifier,
        systemSource,
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
