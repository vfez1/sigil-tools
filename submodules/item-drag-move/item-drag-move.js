import { MODULE_NAME } from "../shared/const.js";

const TARGET_DEFAULT_DROP = "dnd5e.applications.actor.BaseActorSheet.prototype._defaultDropBehavior";
const TARGET_DROP_CREATE = "dnd5e.applications.actor.BaseActorSheet.prototype._onDropCreateItems";

// UUIDs of items this client is moving right now, from the drop until the original is deleted.
const moving = new Set();

// On. There's no setting for it; set this to false to switch it off, which leaves dnd5e's own
// drag behavior (copy between sheets unless Shift is held).
const ENABLED = true;

// Wrapped at `setup`, like grid-regions, so any module that replaces dnd5e's sheet classes
// during `init` has already done so.
export function registerItemDragMoveHooks() {
    if (!ENABLED) return;
    Hooks.once("setup", _applyMoveBetweenSheets);
}

/**
 * Make dragging an item from one actor's sheet onto another's move it instead of copying it, and
 * make every move happen exactly once (see _moveOnce).
 *
 * dnd5e decides a drop's behavior in `_dropBehavior`: its Drag Move key (Shift) forces a move,
 * its Drag Copy key (Ctrl/Alt) forces a copy, and with neither held it asks
 * `_defaultDropBehavior`, which moves only within the same actor and copies everything else.
 * This changes only that default, and only for an Item embedded in another actor, so:
 *
 * - Compendium → sheet stays a copy. `fromUuidSync` returns an index entry rather than an Item
 *   for a pack, and dnd5e's `_allowedDropBehaviors` forbids moving out of a compendium anyway.
 * - Items sidebar → sheet stays a copy (no parent actor), so the world's master items stay put.
 * - Ctrl/Alt still copy: the keys are checked before the default is ever consulted.
 * - A sheet the user doesn't own stays a copy. dnd5e's move creates the new item and then
 *   deletes the original from the dropping user's client; without owner permission on the
 *   source that delete fails and the drop would have copied regardless.
 *
 * Everything else about the move is dnd5e's own code path (`_onDropCreateItems` and
 * `_onDropItemContainer` delete the source with `deleteContents: true`), so a container moves
 * with its contents. Wrapping BaseActorSheet covers the character, NPC and group sheets, which
 * all extend it. libWrapper reports a conflict rather than one of us silently losing the patch.
 */
function _applyMoveBetweenSheets() {
    libWrapper.register(MODULE_NAME, TARGET_DEFAULT_DROP, function (wrapped, event, data) {
        const behavior = wrapped(event, data);
        if ((behavior !== "copy") || (data?.type !== "Item") || !data.uuid) return behavior;
        return _isOwnedItemOnAnotherActor(data.uuid, this.inventorySource) ? "move" : behavior;
    }, "WRAPPER");

    libWrapper.register(MODULE_NAME, TARGET_DROP_CREATE, _moveOnce, "MIXED");
}

/**
 * Make a move (any move: this module's default or a Shift-drag) happen exactly once.
 *
 * dnd5e's `_onDropCreateItems` moves by creating the new items and then calling `delete()` on
 * the originals without awaiting it. On a busy world that delete lands a second or more later,
 * and until then the old sheet still shows the original: dragging it again, easy when moving
 * things back and forth quickly, creates a second item from it, and that second move's delete
 * then fails because the original is already gone ("id ... does not exist in the
 * EmbeddedCollection"). The result is a duplicate.
 *
 * So here a move runs as a copy followed by deleting the originals *awaited*, and while that's
 * in flight, or once an original is gone, a further drop of the same item is refused. dnd5e's
 * creation path (stacking, containers, advancement) is untouched: only the final delete moves
 * here, and it deletes exactly what dnd5e would have (every dropped item, with its contents).
 * The group sheet's override filters out non-physical items before calling this, so those are
 * never deleted, as in dnd5e.
 * @this {BaseActorSheet}
 */
async function _moveOnce(wrapped, event, items, behavior) {
    behavior ??= event?._behavior;
    if (behavior !== "move") return wrapped(event, items, behavior);

    const stale = items.filter(i => moving.has(i.uuid) || (i.parent && !i.parent.items.has(i.id)));
    if (stale.length) {
        ui.notifications.warn(`${stale.map(i => i.name).join(", ")} is already being moved.`);
        items = items.filter(i => !stale.includes(i));
    }
    if (!items.length) return [];

    items.forEach(i => moving.add(i.uuid));
    try {
        const created = await wrapped(event, items, "copy");
        await Promise.all(items.map(i => i.delete({ deleteContents: true })));
        return created;
    } finally {
        items.forEach(i => moving.delete(i.uuid));
    }
}

/**
 * Whether `uuid` is an Item embedded in an actor other than `target` that this user owns.
 * Called on every dragover, so it stays synchronous: `fromUuidSync` resolves world documents
 * from memory, including items on unlinked token actors.
 * @param {string} uuid
 * @param {Actor} target  The actor whose sheet the item is being dropped on.
 * @returns {boolean}
 */
function _isOwnedItemOnAnotherActor(uuid, target) {
    const item = fromUuidSync(uuid);
    if (!(item instanceof Item) || item.pack) return false;
    const source = item.parent;
    return (source instanceof Actor) && (source !== target) && source.isOwner;
}
