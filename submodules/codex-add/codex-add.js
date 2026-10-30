// Add to Codex: puts an actor (a world actor or a compendium entry) into the Sigil Codex
// (cityofdoors.net/codex) as a page of its own, as an NPC or as a monster. Two entries, *Add to
// Codex as NPC* and *Add to Codex as monster*, in an actor sheet's header menu (⋮) and in the
// right-click menu of the Actors sidebar and of every Actor compendium; GMs only. The NPC entry is
// only on world actors (an NPC page links a Sigil world actor), the monster entry only on NPC-type
// actors (a creature with a stat block), world or compendium.
//
// Each opens the Codex at #foundry-add/<npc|monster>/<uuid> in the browser tab named "sigil-codex"
// (the one a previous click opened, else a new one). The Codex makes the page there and runs its
// Import from Foundry with that actor, or opens the page that already has it, and says what it did.
// Making a page needs the Codex's dmTools; it signs in with the browser's own login, so nothing
// passes through Foundry.
//
// A third entry, *Find art in Art Finder*, on every actor (world or compendium), opens the Art Finder's
// Find art tab (/codex/art-finder/#actor/<uuid>, in the tab named "sigil-art-finder") on the actor: a
// search of Foundry's pictures starting on its name, where the picture picked becomes its portrait (and
// token art), written by Garuk, so the open sheet updates. The same entry on a scene (the Scenes sidebar's
// Scene compendiums' and navigation bar's right-click menus, and the scene config's header menu) opens it at
// #scene/<uuid>, where the picture picked becomes the scene's background.

const CODEX_TAB = "sigil-codex";
const ART_TAB = "sigil-art-finder";
const KINDS = [
    { kind: "npc", label: "Add to Codex as NPC", icon: "fa-solid fa-user-plus", fits: (actor, inPack) => !!actor && !inPack && actor.type !== "group" },
    { kind: "monster", label: "Add to Codex as monster", icon: "fa-solid fa-dragon", fits: actor => actor?.type === "npc" },
    { kind: "art", label: "Find art in Art Finder", icon: "fa-solid fa-image", fits: actor => !!actor },
];

function openCodex(kind, uuid, docType = "actor") {
    if (!uuid) return;
    if (kind === "art") window.open(`${window.location.origin}/codex/art-finder/#${docType}/${encodeURIComponent(uuid)}`, ART_TAB);
    else window.open(`${window.location.origin}/codex/#foundry-add/${kind}/${encodeURIComponent(uuid)}`, CODEX_TAB);
}

// The actor or scene (or a compendium's index entry, which has an actor's type) and UUID of a directory row.
function rowActor(app, li, collection = game.actors) {
    const id = li?.dataset?.entryId;
    if (!id) return {};
    const pack = app.collection instanceof foundry.documents.collections.CompendiumCollection ? app.collection : null;
    if (pack) return { actor: pack.index.get(id), uuid: pack.getUuid(id), inPack: true };
    const actor = collection.get(id);
    return { actor, uuid: actor?.uuid, inPack: false };
}
const ART = KINDS.find(k => k.kind === "art");
// A scene's UUID from a row of the Scenes sidebar or a Scene compendium (data-entry-id), or a scene of the
// navigation bar (data-scene-id, which shares their hook; its level rows also carry data-level-id).
function sceneUuid(app, li) {
    if (li?.dataset?.entryId) return rowActor(app, li, game.scenes).uuid;
    return li?.dataset?.sceneId && !li.dataset.levelId ? game.scenes.get(li.dataset.sceneId)?.uuid : undefined;
}

export function registerCodexAddHooks() {
    // The sheet's header menu (ActorSheetV2's hook fires for every actor sheet built on it, dnd5e's too).
    Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
        if (!game.user.isGM) return;
        for (const k of KINDS) {
            if (!k.fits(app.document, !!app.document.pack)) continue;
            controls.push({ action: `sigilCodexAdd-${k.kind}`, icon: k.icon, label: k.label, onClick: () => openCodex(k.kind, app.document.uuid) });
        }
    });
    // The Actors sidebar's and the Actor compendiums' right-click menus (a Compendium is a DocumentDirectory).
    Hooks.on("getActorContextOptions", (app, options) => {
        if (!game.user.isGM) return;
        for (const k of KINDS) {
            options.push({
                label: k.label,
                icon: k.icon,
                visible: li => { const r = rowActor(app, li); return k.fits(r.actor, r.inPack); },
                onClick: (event, li) => openCodex(k.kind, rowActor(app, li).uuid),
            });
        }
    });
    // Scenes: the right-click menus of the Scenes sidebar, Scene compendiums and the navigation bar, and the scene config's header menu.
    Hooks.on("getSceneContextOptions", (app, options) => {
        if (!game.user.isGM) return;
        options.push({
            label: ART.label,
            icon: ART.icon,
            visible: li => !!sceneUuid(app, li),
            onClick: (event, li) => openCodex("art", sceneUuid(app, li), "scene"),
        });
    });
    Hooks.on("getHeaderControlsSceneConfig", (app, controls) => {
        if (!game.user.isGM) return;
        controls.push({ action: "sigilCodexAdd-art", icon: ART.icon, label: ART.label, onClick: () => openCodex("art", app.document.uuid, "scene") });
    });
}
