import { getPresetsForActor, buildRegionData, findAuraRegionsForToken } from "./helpers.js";

async function onCreateToken(tokenDoc, options, userId) {
    if (game.user.id !== userId) return;
    if (!game.user.isGM) return;
    if (!tokenDoc.actor) return;

    const presets = getPresetsForActor(tokenDoc.actor);
    if (!presets.length) return;

    const regionData = presets.map(p => buildRegionData(p, tokenDoc));
    try {
        await tokenDoc.parent.createEmbeddedDocuments("Region", regionData);
    } catch(e) {
        console.error("[visual-auras]", "createToken | failed to create regions:", e);
    }
}

async function onDeleteToken(tokenDoc, options, userId) {
    if (game.user.id !== userId) return;
    if (!game.user.isGM) return;

    const scene = tokenDoc.parent;
    if (!scene) return;

    const toDelete = findAuraRegionsForToken(scene, tokenDoc.id).map(r => r.id);
    if (!toDelete.length) return;

    try {
        await scene.deleteEmbeddedDocuments("Region", toDelete);
    } catch(e) {
        console.error("[visual-auras]", "deleteToken | failed to delete regions:", e);
    }
}

async function onCanvasReady(canvas) {
    if (!game.user.isGM) return;
    const scene = canvas.scene;
    if (!scene) return;

    for (const tokenDoc of scene.tokens) {
        if (!tokenDoc.actor) continue;

        const presets = getPresetsForActor(tokenDoc.actor);
        const assignedIds = new Set(presets.map(p => p.id));
        const existingRegions = findAuraRegionsForToken(scene, tokenDoc.id);

        // Delete regions whose preset is no longer assigned
        const toDelete = existingRegions
            .filter(r => !assignedIds.has(r.getFlag("sigil-tools", "visualAuras.presetId")))
            .map(r => r.id);

        if (toDelete.length) {
            try {
                await scene.deleteEmbeddedDocuments("Region", toDelete);
            } catch(e) {
                console.error("[visual-auras]", "canvasReady | failed to delete stale regions:", e);
            }
        }

        // Create regions for assigned presets that don't have one yet
        const survivingPresetIds = new Set(
            existingRegions
                .filter(r => !toDelete.includes(r.id))
                .map(r => r.getFlag("sigil-tools", "visualAuras.presetId"))
                .filter(Boolean)
        );

        const missing = presets.filter(p => !survivingPresetIds.has(p.id));
        if (!missing.length) continue;

        try {
            await scene.createEmbeddedDocuments("Region", missing.map(p => buildRegionData(p, tokenDoc)));
        } catch(e) {
            console.error("[visual-auras]", "canvasReady | failed to create regions:", e);
        }
    }
}

export function registerHooks() {
    Hooks.on("createToken", onCreateToken);
    Hooks.on("deleteToken", onDeleteToken);
    Hooks.on("canvasReady", onCanvasReady);
}
