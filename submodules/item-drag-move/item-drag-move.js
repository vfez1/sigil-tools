import { MODULE_NAME } from "../shared/const.js";

const TARGET_DEFAULT_DROP = "dnd5e.applications.actor.BaseActorSheet.prototype._defaultDropBehavior";

// Switched off for now: dnd5e's own drag behavior applies (copy between sheets unless Shift is
// held). There's no setting for it; set this to true to switch it back on.
const ENABLED = false;

// Wrapped at `setup`, like grid-regions, so any module that replaces dnd5e's sheet classes
// during `init` has already done so.
export function registerItemDragMoveHooks() {
    if (!ENABLED) return;
    Hooks.once("setup", _applyMoveBetweenSheets);
}

/**
 * Make dragging an item from one actor's sheet onto another's move it instead of copying it.
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
