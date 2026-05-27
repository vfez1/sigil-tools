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

export function findAuraRegionsForToken(scene, tokenId) {
    return scene.regions.filter(r => r.getFlag("sigil-tools", "visualAuras.tokenId") === tokenId);
}
