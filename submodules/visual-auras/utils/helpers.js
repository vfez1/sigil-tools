import { getPresets, getActorConfig } from "./settings.js";
import { SettingsUtility } from "../../shared/settings.js";

/** Debug trace, only emitted when the Sigil Tools "Debug Logs" setting is on. */
export function vaLog(msg, data) {
    if (!SettingsUtility.isDebugLogging()) return;
    const who = `${game.user?.name}${game.user?.isGM ? " (GM)" : ""}`;
    if (data === undefined) console.log(`[VA DEBUG] [${who}] ${msg}`);
    else console.log(`[VA DEBUG] [${who}] ${msg}`, data);
}

/** Compact description of an actor for the debug trace, including its polymorph lineage. */
export function describeActor(actor) {
    if (!actor) return "none";
    const orig = actor.flags?.dnd5e?.originalActor;
    const origName = orig ? (game.actors.get(orig)?.name ?? "?") : null;
    return `${actor.name}#${actor.id}${actor.isPolymorphed ? ` (polymorphed from ${origName}#${orig})` : ""}`;
}

/** Compact description of a scene's aura regions for a token. */
function describeRegions(regions) {
    return regions.map(r => `${r.id}:${r.getFlag("sigil-tools", "visualAuras.presetId")}`);
}

/**
 * The actor whose name keys the aura config. A wild-shaped / polymorphed actor is a
 * temporary copy with a different name ("Wabu (Quetzalcoatlus)"), so look up the
 * original it was transformed from instead.
 */
function resolveConfigActor(actor) {
    if (!actor?.isPolymorphed) return actor;
    const originalId = actor.flags?.dnd5e?.originalActor;
    return (originalId && game.actors.get(originalId)) || actor;
}

export function getPresetsForActor(actor) {
    if (!actor) return [];

    const config = getActorConfig();
    const configActor = resolveConfigActor(actor);
    const actorNameLower = configActor.name.toLowerCase();
    const entry = Object.entries(config).find(([k]) => k.toLowerCase() === actorNameLower);
    const raw = entry?.[1];
    const presetIds = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    if (!presetIds.length) {
        if (actor.isPolymorphed) vaLog(`getPresetsForActor: NO config entry for ${describeActor(actor)} (looked up as "${configActor.name}") — config keys=${JSON.stringify(Object.keys(config))}`);
        return [];
    }

    const allPresets = getPresets();
    const found = allPresets.filter(p => presetIds.includes(p.id));
    vaLog(`getPresetsForActor: ${describeActor(actor)}${configActor !== actor ? ` via original "${configActor.name}"` : ""} → configured=${JSON.stringify(presetIds)} resolved=${JSON.stringify(found.map(p => p.id))}`);
    return found;
}

function getPresetsForToken(tokenDoc) {
    const actor = tokenDoc.actor;
    if (!actor) return [];

    const actorPresets = getPresetsForActor(actor);
    if (!actorPresets.length) return [];

    const disabledIds = tokenDoc.getFlag("sigil-tools", "visualAuras.disabled") ?? [];
    // Hidden is a purely visual, per-token override: even an enabled preset produces no
    // region on a token where it's hidden.
    const hiddenIds = tokenDoc.getFlag("sigil-tools", "visualAuras.hidden") ?? [];
    if (!disabledIds.length && !hiddenIds.length) return actorPresets;

    return actorPresets.filter(p => !disabledIds.includes(p.id) && !hiddenIds.includes(p.id));
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

/**
 * Bring one token's aura regions in line with its current actor, effects and flags.
 * Used on canvasReady for every token, and on updateToken when the token's actor is
 * swapped (wild shape / revert), since both can leave regions and flags stale:
 *  - effect-linked presets follow the live effect state (flags may have gone stale on a
 *    scene that wasn't active when the effect toggled);
 *  - default-off presets with no region and no flag entry get stamped disabled (newly
 *    assigned presets, or flags wiped by dnd5e's revert which replaces the token's flags
 *    from the prototype token);
 *  - regions for presets no longer assigned/enabled are deleted, missing ones created.
 */
export async function reconcileTokenAuras(tokenDoc, source = "reconcile") {
    const scene = tokenDoc.parent;
    if (!scene) return;
    const actor = tokenDoc.actor;
    if (!actor) {
        vaLog(`${source}: token=${tokenDoc.name}#${tokenDoc.id} has NO actor (actorId=${tokenDoc.actorId}) — skipped`);
        return;
    }

    const actorPresets = getPresetsForActor(actor);
    const effectStateByPreset = buildEffectStateByPreset(actor);
    const existingRegions = findAuraRegionsForToken(scene, tokenDoc.id);
    const existingPresetIds = new Set(
        existingRegions.map(r => r.getFlag("sigil-tools", "visualAuras.presetId")).filter(Boolean)
    );
    const currentDisabled = tokenDoc.getFlag("sigil-tools", "visualAuras.disabled") ?? [];
    vaLog(`${source}: token=${tokenDoc.name}#${tokenDoc.id} actor=${describeActor(actor)} effectState=${JSON.stringify(Object.fromEntries(effectStateByPreset))} disabled=${JSON.stringify(currentDisabled)} hidden=${JSON.stringify(tokenDoc.getFlag("sigil-tools", "visualAuras.hidden") ?? [])}`);

    let newDisabled = [...currentDisabled];
    for (const [presetId, isEnabled] of effectStateByPreset) {
        if (isEnabled) newDisabled = newDisabled.filter(id => id !== presetId);
        else if (!newDisabled.includes(presetId)) newDisabled.push(presetId);
    }
    for (const p of actorPresets) {
        if (effectStateByPreset.has(p.id)) continue;
        if (!p.defaultEnabled && !existingPresetIds.has(p.id) && !newDisabled.includes(p.id)) newDisabled.push(p.id);
    }
    const flagChanged = newDisabled.length !== currentDisabled.length || newDisabled.some(id => !currentDisabled.includes(id));
    if (flagChanged) {
        vaLog(`${source}: token=${tokenDoc.name}#${tokenDoc.id} re-stamping disabled ${JSON.stringify(currentDisabled)} → ${JSON.stringify(newDisabled)}`);
        await tokenDoc.update(
            { "flags.sigil-tools.visualAuras.disabled": newDisabled },
            { "visual-auras.skipRefresh": true }
        );
    }

    // Respects per-token disabled / hidden flags
    const presets = getPresetsForToken(tokenDoc);
    const assignedIds = new Set(presets.map(p => p.id));

    const toDelete = existingRegions
        .filter(r => !assignedIds.has(r.getFlag("sigil-tools", "visualAuras.presetId")))
        .map(r => r.id);
    vaLog(`${source}: token=${tokenDoc.name}#${tokenDoc.id} presetsForToken=${JSON.stringify([...assignedIds])} existingRegions=${JSON.stringify(describeRegions(existingRegions))} toDelete=${JSON.stringify(toDelete)}`);

    if (toDelete.length) {
        try {
            await scene.deleteEmbeddedDocuments("Region", toDelete);
        } catch(e) {
            console.error("[visual-auras]", `${source} | failed to delete stale regions:`, e);
        }
    }

    const survivingPresetIds = new Set(
        existingRegions
            .filter(r => !toDelete.includes(r.id))
            .map(r => r.getFlag("sigil-tools", "visualAuras.presetId"))
            .filter(Boolean)
    );
    const missing = presets.filter(p => !survivingPresetIds.has(p.id));
    if (!missing.length) return;

    vaLog(`${source}: token=${tokenDoc.name}#${tokenDoc.id} creating missing=${JSON.stringify(missing.map(p => p.id))}`);
    try {
        await scene.createEmbeddedDocuments("Region", missing.map(p => buildRegionData(p, tokenDoc)));
    } catch(e) {
        console.error("[visual-auras]", `${source} | failed to create regions:`, e);
    }
}

export async function refreshTokenAuras(tokenDoc) {
    const scene = tokenDoc.parent;
    if (!scene) return;

    const existingIds = findAuraRegionsForToken(scene, tokenDoc.id).map(r => r.id);
    vaLog(`refreshTokenAuras: token=${tokenDoc.name}#${tokenDoc.id} scene=${scene.name} actor=${describeActor(tokenDoc.actor)} existingRegions=${JSON.stringify(existingIds)} disabled=${JSON.stringify(tokenDoc.getFlag("sigil-tools", "visualAuras.disabled") ?? [])} hidden=${JSON.stringify(tokenDoc.getFlag("sigil-tools", "visualAuras.hidden") ?? [])}`);
    if (existingIds.length) {
        try {
            await scene.deleteEmbeddedDocuments("Region", existingIds);
        } catch(e) {
            console.error("[visual-auras]", "refreshTokenAuras | delete failed:", e);
        }
    }

    const presets = getPresetsForToken(tokenDoc);
    vaLog(`refreshTokenAuras: token=${tokenDoc.name}#${tokenDoc.id} creating presets=${JSON.stringify(presets.map(p => p.id))}`);
    if (!presets.length) return;

    try {
        await scene.createEmbeddedDocuments("Region", presets.map(p => buildRegionData(p, tokenDoc)));
    } catch(e) {
        console.error("[visual-auras]", "refreshTokenAuras | create failed:", e);
    }
}
