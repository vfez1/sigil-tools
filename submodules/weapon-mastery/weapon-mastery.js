import { MODULE_SHORT } from "../shared/const.js";

/**
 * Weapon mastery properties dnd5e 6 only labels on the attack card, automated.
 *
 * Sap (2024 rules): "If you hit a creature with this weapon, that creature has Disadvantage on its
 * next attack roll before the start of your next turn."
 *
 * A hit with Sap (the attack roll's `options.mastery` is "sap", which dnd5e sets only when the
 * attacker has mastery of the weapon) gives each target hit a copy of the "Sapped" effect in the
 * DDB Active Effects compendium, whose name, picture, description and changes are edited there.
 * Its change, `system.rolls.attack.mode` -1, is the field dnd5e reads for disadvantage on every
 * attack roll, so the roll is made with disadvantage however it's started. The target's next attack
 * roll removes it. The code sets only the copy's duration, start, origin and flag.
 *
 * Its duration is core's: 1 round, expiring at `turnStart`, with `start.combatant` set to the
 * attacker. Core's `ActiveEffect#isExpiryEvent` ends a `turnStart` effect at the start of the
 * turn of `start.combatant`, not of the actor carrying it, so the effect ends when the attacker's
 * next turn starts. A hit made before the attacker has acted this round (a reaction) starts the
 * effect a round earlier, so it still ends at the attacker's turn this round. Out of combat core
 * treats it as 6 seconds of game time. Core only marks an expired effect `expired` (switched off);
 * the tab that marked it then deletes it.
 *
 * Two things give it, whichever comes first, one effect per card and creature:
 *
 * - Damage from a Sap attack card applied to a creature (the card's damage tray, which passes the
 *   card as `options.origin` to `dnd5e.applyDamage`). The tray only applies damage to tokens the
 *   clicker owns, so the clicker's tab adds the effect itself. No targeting needed.
 * - A hit on a creature targeted when the attack was rolled.
 *
 * Targeted hits are checked in the Gamemaster's tab, since the attacker's player can't put an
 * effect on a creature they don't own. roll-model writes the attack roll into the activity card
 * after it's created, and its advantage/disadvantage buttons can change it afterwards, so every
 * update of the card is checked again: targets it now hits get the effect, targets it no longer
 * hits lose the one it gave them.
 */

// On. There's no setting for it; set this to false to switch it off.
const ENABLED = true;

const FLAG = "sap";
const EFFECTS_PACK = "world.ddb-active-effects";
const SAP_NAME = "Sapped";

export function registerWeaponMasteryHooks() {
    if (!ENABLED) return;
    Hooks.on("createChatMessage", (message) => {
        if (_isGamemasterTab()) _queueSync(message);
    });
    Hooks.on("updateChatMessage", (message, changes) => {
        if (_isGamemasterTab() && ("rolls" in changes || "system" in changes)) _queueSync(message);
    });
    Hooks.on("dnd5e.applyDamage", (actor, amount, options) => {
        if (amount < 0) return;
        const message = options?.origin ?? game.messages.get(options?.originatingMessage?.id ?? options?.originatingMessage);
        if (message instanceof ChatMessage) _sapOnDamage(actor, message);
    });
    // The sapped creature's next attack roll uses the disadvantage up. Only the roller's tab gets
    // this hook, and the roller owns the actor.
    Hooks.on("dnd5e.rollAttack", (rolls, { subject }) => {
        const actor = subject?.actor;
        const ids = _sapEffects(actor).filter((e) => e.active).map((e) => e.id);
        if (ids.length) actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    });
    Hooks.on("updateActiveEffect", (effect, changes, options, userId) => {
        if (userId !== game.user.id || !effect.flags?.[MODULE_SHORT]?.[FLAG]) return;
        if (changes.duration?.expired === true) effect.delete();
    });
    Hooks.on("deleteCombat", (combat) => {
        if (!_isGamemasterTab()) return;
        for (const combatant of combat.combatants) {
            const actor = combatant.actor;
            const ids = _sapEffects(actor).filter((e) => e.flags[MODULE_SHORT][FLAG].combat === combat.id).map((e) => e.id);
            if (ids.length) actor.deleteEmbeddedDocuments("ActiveEffect", ids);
        }
    });
}

/**
 * Only a full Gamemaster's tab does the work, never an Assistant GM's (Garuk, the cityofdoors
 * website's user, is one and runs no code). Of several Gamemasters online, the one with the lowest
 * id acts, so every tab agrees on one.
 */
function _isGamemasterTab() {
    const gamemasters = game.users
        .filter((u) => u.active && u.role === CONST.USER_ROLES.GAMEMASTER)
        .sort((a, b) => a.id.localeCompare(b.id));
    return gamemasters[0]?.id === game.user.id;
}

function _sapEffects(actor) {
    return actor?.effects.filter((e) => e.flags?.[MODULE_SHORT]?.[FLAG]) ?? [];
}

function _targetActor(descriptor) {
    const token = descriptor.token ? fromUuidSync(descriptor.token, { strict: false }) : null;
    return token?.actor ?? (descriptor.actor ? fromUuidSync(descriptor.actor, { strict: false }) : null);
}

// One check at a time per card, so a card created and updated in quick succession can't give a
// target the effect twice.
const _pending = new Map();

function _queueSync(message) {
    const next = (_pending.get(message.id) ?? Promise.resolve())
        .then(() => _syncSap(message))
        .catch((err) => console.error("sigil-tools | weapon-mastery: Sap check failed", err));
    _pending.set(message.id, next);
    next.then(() => { if (_pending.get(message.id) === next) _pending.delete(message.id); });
}

function _sapRoll(message) {
    const roll = message.rolls?.find((r) => r instanceof CONFIG.Dice.D20Roll);
    return roll?.options.mastery === "sap" ? roll : null;
}

function _hasSapFrom(actor, message) {
    return _sapEffects(actor).some((e) => e.flags[MODULE_SHORT][FLAG].message === message.id);
}

async function _sapOnDamage(actor, message) {
    if (!_sapRoll(message) || _hasSapFrom(actor, message)) return;
    const template = await _sapTemplate();
    if (template && !_hasSapFrom(actor, message)) {
        await actor.createEmbeddedDocuments("ActiveEffect", [_sapEffectData(template, message)]);
    }
}

async function _syncSap(message) {
    const targets = message.system?.targets ?? [];
    if (!targets.length) return;
    const sapRoll = _sapRoll(message);
    const template = sapRoll ? await _sapTemplate() : null;

    for (const descriptor of targets) {
        const actor = _targetActor(descriptor);
        if (!actor) continue;
        const hit = !!sapRoll && descriptor.ac !== null && descriptor.ac !== undefined
            && (sapRoll.isCritical || (sapRoll.total >= descriptor.ac && !sapRoll.isFumble));
        const existing = _sapEffects(actor).filter((e) => e.flags[MODULE_SHORT][FLAG].message === message.id);
        if (hit && template && !existing.length) {
            await actor.createEmbeddedDocuments("ActiveEffect", [_sapEffectData(template, message)]);
        } else if (!hit && existing.length) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", existing.map((e) => e.id));
        }
    }
}

// Read from the compendium on every hit, so an edit there counts from the next one.
async function _sapTemplate() {
    const pack = game.packs.get(EFFECTS_PACK);
    const entry = pack?.index.find((e) => e.name === SAP_NAME);
    const template = entry ? await pack.getDocument(entry._id) : null;
    if (!template) ui.notifications.warn(`Sap: no "${SAP_NAME}" effect in ${pack?.title ?? EFFECTS_PACK}, so none was applied.`);
    return template;
}

function _sapEffectData(template, message) {
    const attacker = message.getAssociatedActor();
    const item = message.getAssociatedItem();
    const combat = game.combat?.started ? game.combat : null;
    const combatant = combat
        ? (combat.combatants.find((c) => c.tokenId === message.speaker?.token) ?? combat.getCombatantsByActor(attacker)[0])
        : null;

    const data = foundry.utils.mergeObject(template.toObject(), {
        origin: item?.uuid ?? null,
        transfer: false,
        disabled: false,
        duration: { value: 1, units: "rounds", expiry: "turnStart", expired: false },
        flags: { [MODULE_SHORT]: { [FLAG]: { message: message.id, combat: combat?.id ?? null } } },
    });
    delete data._id;
    delete data.folder;
    delete data.sort;
    delete data._stats;

    if (combatant) {
        // The attacker hasn't had its turn yet this round (a reaction): the effect ends at that
        // turn, so it counts as started a round earlier.
        const attackerTurn = combat.turns.findIndex((c) => c.id === combatant.id);
        const notYetActed = attackerTurn > combat.turn;
        data.start = {
            combat: combat.id,
            combatant: combatant.id,
            round: notYetActed ? combat.round - 1 : combat.round,
            turn: combat.turn,
            time: game.time.worldTime,
        };
    }
    return data;
}
