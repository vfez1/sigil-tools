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
        if (!presets.length) continue;

        const existingRegions = findAuraRegionsForToken(scene, tokenDoc.id);
        const existingPresetIds = new Set(
            existingRegions.map(r => r.getFlag("sigil-tools", "visualAuras.presetId")).filter(Boolean)
        );

        const missing = presets.filter(p => !existingPresetIds.has(p.id));
        if (!missing.length) continue;

        const regionData = missing.map(p => buildRegionData(p, tokenDoc));
        try {
            await scene.createEmbeddedDocuments("Region", regionData);
        } catch(e) {
            console.error("[visual-auras]", "canvasReady | failed to create regions for", tokenDoc.name, ":", e);
        }
    }
}

export function registerHooks() {
    Hooks.on("createToken", onCreateToken);
    Hooks.on("deleteToken", onDeleteToken);
    Hooks.on("canvasReady", onCanvasReady);
}
