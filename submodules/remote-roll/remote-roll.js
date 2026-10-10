// Remote rolls: lets the inventory website (cityofdoors.net, through Garuk's connection) ask a
// player's open Foundry tab to make a roll from their character's sheet, so the roll is dnd5e's own,
// with every bonus and effect on the character (Guidance, items, features) and the usual chat card.
//
// Garuk's connection is a plain socket, not a Foundry client, so it can't run dnd5e's code itself; it
// sends a request on this module's socket channel naming the user who should roll, and that user's
// tab rolls and sends back the result. Used by Avi's Spells for the Arcana check when copying a spell
// from a scroll.
//
// Request:  { type: "remoteSkillRoll", requestId, userId, actorId, skill, dc }
// Reply:    { type: "remoteSkillRollResult", requestId, userId, total, d20 } or { …, error }

const MODULE_ID = "sigil-tools";

async function onMessage(data) {
    if (data?.type !== "remoteSkillRoll" || data.userId !== game.user.id) return;
    const reply = (fields) => game.socket.emit(`module.${MODULE_ID}`, {
        type: "remoteSkillRollResult", requestId: data.requestId, userId: game.user.id, ...fields,
    });
    const actor = game.actors.get(data.actorId);
    if (!actor?.isOwner) return reply({ error: "actor_not_found" });
    try {
        // dnd5e's own skill roll, without its dialog; the DC makes the card show success or failure.
        const rolls = await actor.rollSkill({ skill: data.skill, target: data.dc }, { configure: false });
        const roll = Array.isArray(rolls) ? rolls[0] : rolls;
        if (!roll) return reply({ error: "no_roll" });
        reply({ total: roll.total, d20: roll.d20?.total ?? null });
    } catch (err) {
        console.error("sigil-tools | remote roll failed", err);
        reply({ error: "roll_failed" });
    }
}

Hooks.once("ready", () => {
    game.socket.on(`module.${MODULE_ID}`, onMessage);
});
