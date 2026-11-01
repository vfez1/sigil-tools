// Garuk is the ff-inventory website's socket-only Foundry user: it creates and updates items but
// runs no dnd5e code.
const WEBSITE_USER_NAME = "Garuk";

// On. There's no setting for it; set this to false to switch it off.
const ENABLED = true;

export function registerCastSpellCacheHooks() {
    if (!ENABLED) return;
    Hooks.on("createItem", (item, options, userId) => {
        if (!_isHandler(userId)) return;
        _cacheSpells([item]);
    });
    Hooks.on("updateItem", (item, changed, options, userId) => {
        if (!_isHandler(userId) || !foundry.utils.hasProperty(changed, "system.activities")) return;
        _cacheSpells([item]);
    });
    // Catches up on anything Garuk added while no GM was logged in, and on actors imported whole
    // (whose items never ran onCreateActivities). Group actors (the party stash) have no spellbook.
    Hooks.once("ready", () => {
        if (game.users.activeGM?.id !== game.user.id) return;
        const actors = game.actors.filter((actor) => actor.type !== "group");
        _cacheSpells(actors.flatMap((actor) => actor.items.contents));
    });
}

/**
 * dnd5e lists an item's Cast activity spells in the spellbook through a hidden copy of each spell
 * on the actor (flagged `dnd5e.cachedFor` with the activity's relative UUID). It makes those copies
 * in `onCreateActivities` / `onUpdateActivities`, which run only in the tab of the user who
 * created or changed the item, so an item Garuk adds (the inventory website) gets none, and its
 * spells stay off the spell page until one is cast from the item (`CastActivity#use` makes the
 * copy on demand). The active GM's tab, which sees Garuk's changes like any other client, makes
 * them instead.
 */
function _isHandler(userId) {
    if (game.users.get(userId)?.name !== WEBSITE_USER_NAME) return false;
    return game.users.activeGM?.id === game.user.id;
}

async function _cacheSpells(items) {
    const byActor = new Map();
    for (const item of items) {
        const actor = item.actor;
        if (!actor || !item.isEmbedded || item.pack) continue;
        const activities = item.system?.activities?.getByType?.("cast") ?? [];
        for (const activity of activities) {
            if (!activity.spell?.uuid || activity.cachedSpell) continue;
            try {
                const data = await activity.getCachedSpellData();
                if (!data) continue;
                if (!byActor.has(actor)) byActor.set(actor, []);
                byActor.get(actor).push({ data, itemName: item.name });
            } catch (err) {
                console.warn(`sigil-tools | cast-spell-cache: ${item.name} (${activity.relativeUUID}):`, err);
            }
        }
    }
    const added = [];
    for (const [actor, spells] of byActor) {
        try {
            await actor.createEmbeddedDocuments("Item", spells.map((s) => s.data));
            for (const s of spells) added.push({ actor: actor.name, item: s.itemName, spell: s.data.name });
            console.log(`sigil-tools | cast-spell-cache: added ${spells.map((s) => s.data.name).join(", ")} to ${actor.name}'s spellbook`);
        } catch (err) {
            console.warn(`sigil-tools | cast-spell-cache: ${actor.name}:`, err);
        }
    }
    if (added.length) _report(added);
}

/** Tell the GM what was added, as a popup listing each actor's new spellbook entries. */
function _report(added) {
    const esc = foundry.utils.escapeHTML;
    const rows = added
        .map((a) => `<li><strong>${esc(a.actor)}</strong>: ${esc(a.spell)} <em>(from ${esc(a.item)})</em></li>`)
        .join("");
    foundry.applications.api.DialogV2.prompt({
        window: { title: "Spells added to spellbooks", icon: "fa-solid fa-book-open" },
        content: `<p>These spells, granted by items, were missing from their actors' spell pages and have been added:</p><ul>${rows}</ul>`,
        ok: { label: "OK" },
        rejectClose: false,
    });
}
