import { getPresets, getActorConfig } from "./settings.js";

export function getPresetsForActor(actor) {
    if (!actor) return [];

    const config = getActorConfig();
    const actorNameLower = actor.name.toLowerCase();
    const entry = Object.entries(config).find(([k]) => k.toLowerCase() === actorNameLower);
    const raw = entry?.[1];
    const presetIds = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    if (!presetIds.length) return [];

    const allPresets = getPresets();
    return allPresets.filter(p => presetIds.includes(p.id));
}

export function getPresetsForToken(tokenDoc) {
    const actor = tokenDoc.actor;
    if (!actor) return [];

    const actorPresets = getPresetsForActor(actor);
    if (!actorPresets.length) return [];

    const disabledIds = tokenDoc.getFlag("sigil-tools", "visualAuras.disabled") ?? [];
    if (!disabledIds.length) return actorPresets;

    return actorPresets.filter(p => !disabledIds.includes(p.id));
}

export function buildRegionData(preset, token) {
    const radiusPx = token.parent.dimensions.distancePixels * preset.radius;

    const visibility = preset.visibility === "ALWAYS"
        ? CONST.REGION_VISIBILITY.ALWAYS
        : CONST.REGION_VISIBILITY.LAYER_UNLOCKED;

    return {
        attachment: { token: token.id },
        color: preset.color,
        displayMeasurements: preset.displayMeasurements ?? false,
        highlightMode: preset.highlightMode ?? "shapes",
        restriction: {
            enabled: preset.restrictionEnabled ?? false,
            type: preset.restrictionType ?? "move",
            priority: preset.restrictionPriority ?? 0,
        },
        flags: {
            "sigil-tools": {
                visualAuras: {
                    presetId: preset.id,
                    actorUuid: token.actor?.uuid,
                    tokenId: token.id,
                },
            },
        },
        locked: true,
        name: `[VA] ${preset.name}`,
        shapes: [{
            type: "emanation",
            base: {
                type: "token",
                x: token._source.x,
                y: token._source.y,
                width: token._source.width,
                height: token._source.height,
                shape: token._source.shape,
                hole: preset.hole ?? false,
            },
            gridBased: preset.gridBased ?? true,
            hole: false,
            radius: radiusPx,
        }],
        visibility,
    };
}

export function buildEffectStateByPreset(actor) {
    const map = new Map();
    for (const effect of (actor.allApplicableEffects?.() ?? [])) {
        if (effect.flags?.ActiveAuras?.applied) continue;
        const presetId = effect.flags?.ActiveAuras?.visualAuraPreset;
        if (!presetId) continue;
        if (!effect.disabled) map.set(presetId, true);
        else if (!map.has(presetId)) map.set(presetId, false);
    }
    return map;
}

export function findAuraRegionsForToken(scene, tokenId) {
    return scene.regions.filter(r => r.getFlag("sigil-tools", "visualAuras.tokenId") === tokenId);
}

export async function refreshCurrentSceneAuras() {
    const scene = game.canvas.scene;
    if (!scene) return;

    for (const tokenDoc of scene.tokens) {
        if (!tokenDoc.actor) continue;

        const existingRegions = findAuraRegionsForToken(scene, tokenDoc.id);
        const existingPresetIds = new Set(
            existingRegions.map(r => r.getFlag("sigil-tools", "visualAuras.presetId")).filter(Boolean)
        );

        // Presets newly assigned to this token (no existing region, not already in
        // the disabled list) that are off by default get stamped as disabled so they
        // appear in the Auras tab but produce no region.
        const currentDisabled = tokenDoc.getFlag("sigil-tools", "visualAuras.disabled") ?? [];
        const newDefaultDisabled = getPresetsForActor(tokenDoc.actor)
            .filter(p => !p.defaultEnabled && !existingPresetIds.has(p.id) && !currentDisabled.includes(p.id))
            .map(p => p.id);

        if (newDefaultDisabled.length) {
            await tokenDoc.update(
                { "flags.sigil-tools.visualAuras.disabled": [...currentDisabled, ...newDefaultDisabled] },
                { "visual-auras.skipRefresh": true }
            );
        }

        const existingIds = existingRegions.map(r => r.id);
        if (existingIds.length) {
            try {
                await scene.deleteEmbeddedDocuments("Region", existingIds);
            } catch(e) {
                console.error("[visual-auras]", "refreshCurrentSceneAuras | delete failed:", e);
            }
        }

        const tokenPresets = getPresetsForToken(tokenDoc);
        if (!tokenPresets.length) continue;

        try {
            await scene.createEmbeddedDocuments("Region", tokenPresets.map(p => buildRegionData(p, tokenDoc)));
        } catch(e) {
            console.error("[visual-auras]", "refreshCurrentSceneAuras | create failed:", e);
        }
    }
}

export async function refreshTokenAuras(tokenDoc) {
    const scene = tokenDoc.parent;
    if (!scene) return;

    const existingIds = findAuraRegionsForToken(scene, tokenDoc.id).map(r => r.id);
    if (existingIds.length) {
        try {
            await scene.deleteEmbeddedDocuments("Region", existingIds);
        } catch(e) {
            console.error("[visual-auras]", "refreshTokenAuras | delete failed:", e);
        }
    }

    const presets = getPresetsForToken(tokenDoc);
    if (!presets.length) return;

    try {
        await scene.createEmbeddedDocuments("Region", presets.map(p => buildRegionData(p, tokenDoc)));
    } catch(e) {
        console.error("[visual-auras]", "refreshTokenAuras | create failed:", e);
    }
}
