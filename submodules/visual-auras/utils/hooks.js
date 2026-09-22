import { getPresetsForActor, buildRegionData, buildEffectStateByPreset, findAuraRegionsForToken, refreshTokenAuras, reconcileTokenAuras, vaLog, describeActor } from "./helpers.js";

async function onCreateToken(tokenDoc, options, userId) {
    vaLog(`createToken: token=${tokenDoc.name}#${tokenDoc.id} scene=${tokenDoc.parent?.name} actor=${describeActor(tokenDoc.actor)} byUser=${userId} isMe=${game.user.id === userId}`);
    if (game.user.id !== userId) return;
    if (!game.user.isGM) return;
    if (!tokenDoc.actor) return;

    const presets = getPresetsForActor(tokenDoc.actor);
    if (!presets.length) return;

    // For presets controlled by an active effect, use the effect's current state
    // instead of defaultEnabled. Without this, dragging a token with an already-active
    // effect onto a scene would stamp the preset as disabled (defaultEnabled=false)
    // even though its controlling effect is live.
    const effectStateByPreset = buildEffectStateByPreset(tokenDoc.actor);

    const enabledPresets = presets.filter(p =>
        effectStateByPreset.has(p.id) ? effectStateByPreset.get(p.id) : !!p.defaultEnabled
    );
    const disabledPresets = presets.filter(p =>
        effectStateByPreset.has(p.id) ? !effectStateByPreset.get(p.id) : !p.defaultEnabled
    );

    // Stamp the disabled flag before creating regions so canvasReady reconciliation
    // agrees with us. Pass skipRefresh so onUpdateToken doesn't also call refreshTokenAuras.
    if (disabledPresets.length) {
        await tokenDoc.update(
            { "flags.sigil-tools.visualAuras.disabled": disabledPresets.map(p => p.id) },
            { "visual-auras.skipRefresh": true }
        );
    }

    if (!enabledPresets.length) return;

    try {
        await tokenDoc.parent.createEmbeddedDocuments("Region", enabledPresets.map(p => buildRegionData(p, tokenDoc)));
    } catch(e) {
        console.error("[visual-auras]", "createToken | failed to create regions:", e);
    }
}

async function onDeleteToken(tokenDoc, options, userId) {
    vaLog(`deleteToken: token=${tokenDoc.name}#${tokenDoc.id} scene=${tokenDoc.parent?.name} actor=${describeActor(tokenDoc.actor)} byUser=${userId} isMe=${game.user.id === userId} role=${game.user.role}`);
    if (game.user.id !== userId) return;
    if (!game.user.isGM) return;
    // Full GM's cascade deletes attached regions; AssistantGM's does not, so they handle it here.
    if (game.user.role === CONST.USER_ROLES.GAMEMASTER) return;

    const scene = tokenDoc.parent;
    if (!scene) return;

    const toDelete = findAuraRegionsForToken(scene, tokenDoc.id)
        .filter(r => scene.regions.has(r.id))
        .map(r => r.id);
    if (!toDelete.length) return;

    try {
        await scene.deleteEmbeddedDocuments("Region", toDelete);
    } catch(e) {
        console.error("[visual-auras]", "deleteToken | failed to delete regions:", e);
    }
}

async function onUpdateToken(tokenDoc, changes, options, userId) {
    const flatChanges = foundry.utils.flattenObject(changes);
    const changeKeys = Object.keys(flatChanges).filter(k => k !== "_id");
    // Only trace changes we might care about (aura flags, actor swap from wild shape, size).
    if (changeKeys.some(k => k.startsWith("flags.sigil-tools") || ["actorId", "width", "height", "name"].includes(k))) {
        const activeGMs = game.users.filter(u => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id));
        vaLog(`updateToken: token=${tokenDoc.name}#${tokenDoc.id} scene=${tokenDoc.parent?.name} actor=${describeActor(tokenDoc.actor)} changes=${JSON.stringify(flatChanges)} byUser=${userId} primaryGM=${activeGMs[0]?.name} skipRefresh=${!!options["visual-auras.skipRefresh"]}`);
    }
    if (!game.user.isGM) return;
    const activeGMs = game.users.filter(u => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id));
    if (activeGMs[0]?.id !== game.user.id) return;
    if (options["visual-auras.skipRefresh"]) return;

    // Wild shape / revert swaps the token's actor (and dnd5e's revert replaces the token's
    // flags wholesale), so the regions and our flags need a full reconcile, not just a refresh.
    if ("actorId" in flatChanges) {
        vaLog(`updateToken: actorId changed on ${tokenDoc.name}#${tokenDoc.id} → reconciling auras`);
        await reconcileTokenAuras(tokenDoc, "updateToken(actorId)");
        return;
    }

    if (!("flags.sigil-tools.visualAuras.disabled" in flatChanges)
        && !("flags.sigil-tools.visualAuras.hidden" in flatChanges)) return;

    await refreshTokenAuras(tokenDoc);
}

async function onCanvasReady(canvas) {
    const scene = canvas.scene;
    vaLog(`canvasReady: scene=${scene?.name}#${scene?.id} tokens=${scene?.tokens.size} auraRegions=${scene ? JSON.stringify(scene.regions.filter(r => r.getFlag("sigil-tools", "visualAuras.tokenId")).map(r => `${r.name}→token#${r.getFlag("sigil-tools", "visualAuras.tokenId")}`)) : "-"}`);
    if (!game.user.isGM) return;
    if (!scene) return;

    for (const tokenDoc of scene.tokens) {
        await reconcileTokenAuras(tokenDoc, "canvasReady");
    }
    vaLog(`canvasReady: scene=${scene.name} reconcile DONE — auraRegions now=${JSON.stringify(scene.regions.filter(r => r.getFlag("sigil-tools", "visualAuras.tokenId")).map(r => `${r.name}→token#${r.getFlag("sigil-tools", "visualAuras.tokenId")}`))}`);
}

async function onRenderTokenConfig(tokenConfig, element, isPlaced) {
    const vaTab = element.querySelector("[data-application-part='visualAuras']");
    if (!vaTab) return;

    // The PARTS system only sets data-application-part; Foundry's tab system needs
    // data-tab + data-group + the "tab" CSS class to control visibility.
    vaTab.dataset.tab = "visualAuras";
    vaTab.dataset.group = "sheet";
    vaTab.classList.add("tab");
    // Sync active state with whichever tab is currently open
    const activeTab = tokenConfig.tabGroups?.sheet;
    vaTab.classList.toggle("active", activeTab === "visualAuras");

    if (!isPlaced) {
        vaTab.innerHTML = '<p class="notes" style="padding:0.5rem 1rem;font-size:0.85em;opacity:0.65;">Per-token aura overrides are not available for prototype tokens.</p>';
        return;
    }

    const tokenDoc = tokenConfig.document;
    const actor = tokenDoc?.actor;
    const presets = actor ? getPresetsForActor(actor) : [];

    if (!presets.length) {
        vaTab.innerHTML = '<p class="notes" style="padding:0.5rem 1rem;font-size:0.85em;opacity:0.65;">No visual auras are assigned to this actor.</p>';
        return;
    }

    const disabledIds = tokenDoc.getFlag("sigil-tools", "visualAuras.disabled") ?? [];
    const hiddenIds = tokenDoc.getFlag("sigil-tools", "visualAuras.hidden") ?? [];

    const rows = presets.map(p => {
        const enabled = !disabledIds.includes(p.id);
        const visible = !hiddenIds.includes(p.id);
        return `<div class="va-pt-row">
            <span class="va-pt-name">${p.name}</span>
            <span class="va-color-swatch" style="background:${p.color};"></span>
            <span class="va-pt-radius">${p.radius} ft</span>
            <div class="va-pt-controls">
                <input type="checkbox" data-va-toggle data-preset-id="${p.id}" ${enabled ? "checked" : ""} title="${enabled ? "Disable" : "Enable"} this aura" />
            </div>
            <div class="va-pt-controls">
                <input type="checkbox" data-va-visible data-preset-id="${p.id}" ${visible ? "checked" : ""} title="${visible ? "Hide" : "Show"} this aura on this token only" />
            </div>
        </div>`;
    }).join("");

    vaTab.innerHTML = `<div class="va-tc-wrap">
        <div class="va-preset-table">
            <div class="va-pt-header">
                <span>Name</span>
                <span>Color</span>
                <span>Radius</span>
                <span>Enabled</span>
                <span>Visible</span>
            </div>
            ${rows}
        </div>
        <p class="va-tc-note">Toggle auras for this token. Unchecking Visible suppresses the aura on this token only, even if enabled. Changes take effect immediately.</p>
    </div>`;

    vaTab.querySelectorAll("[data-va-toggle]").forEach(cb => {
        cb.addEventListener("change", async () => {
            const id = cb.dataset.presetId;
            const current = tokenDoc.getFlag("sigil-tools", "visualAuras.disabled") ?? [];
            const newDisabled = cb.checked
                ? current.filter(pid => pid !== id)
                : [...current.filter(pid => pid !== id), id];
            await tokenDoc.setFlag("sigil-tools", "visualAuras.disabled", newDisabled);
        });
    });

    vaTab.querySelectorAll("[data-va-visible]").forEach(cb => {
        cb.addEventListener("change", async () => {
            const id = cb.dataset.presetId;
            const current = tokenDoc.getFlag("sigil-tools", "visualAuras.hidden") ?? [];
            const newHidden = cb.checked
                ? current.filter(pid => pid !== id)
                : [...current.filter(pid => pid !== id), id];
            await tokenDoc.setFlag("sigil-tools", "visualAuras.hidden", newHidden);
        });
    });
}

async function syncVisualAuraForEffect(effect, enabled) {
    if (!game.user.isGM) return;
    if (effect.flags?.ActiveAuras?.applied) return;

    const presetId = effect.flags?.ActiveAuras?.visualAuraPreset;
    if (!presetId) return;

    const actor = effect.parent instanceof Actor ? effect.parent
        : effect.parent?.parent instanceof Actor ? effect.parent.parent
        : null;
    if (!actor) return;

    const scene = game.canvas.scene;
    if (!scene) return;

    const matchingTokens = scene.tokens.filter(t => t.actor?.id === actor.id);
    vaLog(`syncVisualAuraForEffect: effect="${effect.name}" enabled=${enabled} preset=${presetId} actor=${describeActor(actor)} scene=${scene.name} matchingTokens=${JSON.stringify(matchingTokens.map(t => `${t.name}#${t.id}`))}`);

    const pending = [];
    for (const tokenDoc of matchingTokens) {
        const currentDisabled = tokenDoc.getFlag("sigil-tools", "visualAuras.disabled") ?? [];
        const isCurrentlyDisabled = currentDisabled.includes(presetId);

        if (enabled && !isCurrentlyDisabled) continue;
        if (!enabled && isCurrentlyDisabled) continue;

        const newDisabled = enabled
            ? currentDisabled.filter(id => id !== presetId)
            : [...currentDisabled, presetId];

        pending.push({ tokenDoc, newDisabled });
    }

    vaLog(`syncVisualAuraForEffect: preset=${presetId} flag updates=${JSON.stringify(pending.map(p => `${p.tokenDoc.name}#${p.tokenDoc.id}→${JSON.stringify(p.newDisabled)}`))}`);
    await Promise.all(pending.map(({ tokenDoc, newDisabled }) =>
        tokenDoc.setFlag("sigil-tools", "visualAuras.disabled", newDisabled)
    ));
}

// Trace-only: wild shape / revert events, so the log shows when the token's actor swaps
// relative to canvasReady and the effect hooks.
function onTransformActor(original, target, data) {
    vaLog(`dnd5e.transformActorV2: ${describeActor(original)} → ${target?.name}#${target?.id} activeTokens=${JSON.stringify(original.getActiveTokens(true, true).map(t => `${t.name}#${t.id}@${t.parent?.name}`))}`);
}

function onRevertOriginalForm(actor) {
    vaLog(`dnd5e.revertOriginalForm: ${describeActor(actor)} activeTokens=${JSON.stringify(actor.getActiveTokens(true, true).map(t => `${t.name}#${t.id}@${t.parent?.name}`))}`);
}

function traceEffectEvent(kind, effect, userId, extra = "") {
    if (!effect.flags?.ActiveAuras?.visualAuraPreset) return;
    const parentActor = effect.parent instanceof Actor ? effect.parent : effect.parent?.parent;
    vaLog(`${kind}: effect="${effect.name}" preset=${effect.flags.ActiveAuras.visualAuraPreset} disabled=${effect.disabled} on=${describeActor(parentActor)} byUser=${userId} isMe=${game.user.id === userId}${extra}`);
}

async function onCreateActiveEffect(effect, options, userId) {
    traceEffectEvent("createActiveEffect", effect, userId);
    if (game.user.id !== userId) return;
    if (effect.disabled) return;
    await syncVisualAuraForEffect(effect, true);
}

async function onDeleteActiveEffect(effect, options, userId) {
    traceEffectEvent("deleteActiveEffect", effect, userId);
    if (game.user.id !== userId) return;
    await syncVisualAuraForEffect(effect, false);
}

async function onUpdateActiveEffect(effect, changes, options, userId) {
    traceEffectEvent("updateActiveEffect", effect, userId, ` changes=${JSON.stringify(changes)}`);
    if (game.user.id !== userId) return;
    if (!("disabled" in changes)) return;
    await syncVisualAuraForEffect(effect, !changes.disabled);
}

export function registerHooks() {
    Hooks.on("createToken", onCreateToken);
    Hooks.on("deleteToken", onDeleteToken);
    Hooks.on("updateToken", onUpdateToken);
    Hooks.on("canvasReady", onCanvasReady);
    Hooks.on("renderTokenConfig", (tc, el) => onRenderTokenConfig(tc, el, true));
    Hooks.on("renderPrototypeTokenConfig", (tc, el) => onRenderTokenConfig(tc, el, false));
    Hooks.on("createActiveEffect", onCreateActiveEffect);
    Hooks.on("deleteActiveEffect", onDeleteActiveEffect);
    Hooks.on("updateActiveEffect", onUpdateActiveEffect);
    Hooks.on("dnd5e.transformActorV2", onTransformActor);
    Hooks.on("dnd5e.revertOriginalForm", onRevertOriginalForm);

    // These hooks are registered on `ready`, but Foundry fires the first canvasReady before
    // that — so the scene a client loads into would never be reconciled (only later scene
    // switches would). Catch up on it now.
    if (game.canvas?.ready) {
        vaLog(`registerHooks: canvas already ready (scene=${game.canvas.scene?.name}) — running initial reconcile`);
        onCanvasReady(game.canvas);
    }
}
