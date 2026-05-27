import { getPresetsForActor, getPresetsForToken, buildRegionData, findAuraRegionsForToken, refreshTokenAuras } from "./helpers.js";

async function onCreateToken(tokenDoc, options, userId) {
    if (game.user.id !== userId) return;
    if (!game.user.isGM) return;
    if (!tokenDoc.actor) return;

    // New tokens have no disabled presets yet, so use actor-level presets directly
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

async function onUpdateToken(tokenDoc, changes, options, userId) {
    if (game.user.id !== userId) return;
    if (!game.user.isGM) return;

    const flatChanges = foundry.utils.flattenObject(changes);
    if (!("flags.sigil-tools.visualAuras.disabled" in flatChanges)) return;

    await refreshTokenAuras(tokenDoc);
}

async function onCanvasReady(canvas) {
    if (!game.user.isGM) return;
    const scene = canvas.scene;
    if (!scene) return;

    for (const tokenDoc of scene.tokens) {
        if (!tokenDoc.actor) continue;

        // Use getPresetsForToken to respect per-token disabled flags
        const presets = getPresetsForToken(tokenDoc);
        const assignedIds = new Set(presets.map(p => p.id));
        const existingRegions = findAuraRegionsForToken(scene, tokenDoc.id);

        // Delete regions whose preset is no longer assigned (or is disabled for this token)
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

    const rows = presets.map(p => {
        const enabled = !disabledIds.includes(p.id);
        return `<div class="va-pt-row">
            <span class="va-pt-name">${p.name}</span>
            <span class="va-color-swatch" style="background:${p.color};"></span>
            <span class="va-pt-radius">${p.radius} ft</span>
            <div class="va-pt-controls">
                <input type="checkbox" data-va-toggle data-preset-id="${p.id}" ${enabled ? "checked" : ""} title="${enabled ? "Disable" : "Enable"} this aura" />
            </div>
        </div>`;
    }).join("");

    vaTab.innerHTML = `<div class="va-tc-wrap">
        <div class="va-preset-table">
            <div class="va-pt-header">
                <span>Name</span>
                <span>Color</span>
                <span>Radius</span>
                <span></span>
            </div>
            ${rows}
        </div>
        <p class="va-tc-note">Toggle auras for this token. Changes take effect immediately.</p>
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
}

export function registerHooks() {
    Hooks.on("createToken", onCreateToken);
    Hooks.on("deleteToken", onDeleteToken);
    Hooks.on("updateToken", onUpdateToken);
    Hooks.on("canvasReady", onCanvasReady);
    Hooks.on("renderTokenConfig", (tc, el) => onRenderTokenConfig(tc, el, true));
    Hooks.on("renderPrototypeTokenConfig", (tc, el) => onRenderTokenConfig(tc, el, false));
}
