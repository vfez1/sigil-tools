import { MODULE_NAME } from "../../shared/const.js";
import { VA_SETTING_NAMES, getPresets, getActorConfig } from "../utils/settings.js";
import { buildRegionData, findAuraRegionsForToken } from "../utils/helpers.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class VisualAuraSetupApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "visual-aura-setup",
        classes: ["standard-form", "visual-aura-setup"],
        tag: "div",
        position: { width: 536 },
        window: {
            title: "Visual Aura Setup",
            icon: "fas fa-circle-dashed",
            resizable: true,
        },
        actions: {
            switchTab: VisualAuraSetupApp.switchTab,
            editPreset: VisualAuraSetupApp.editPreset,
            addPreset: VisualAuraSetupApp.addPreset,
            duplicatePreset: VisualAuraSetupApp.duplicatePreset,
            deletePreset: VisualAuraSetupApp.deletePreset,
            savePreset: VisualAuraSetupApp.savePreset,
            cancelEdit: VisualAuraSetupApp.cancelEdit,
            addActor: VisualAuraSetupApp.addActor,
            removeActor: VisualAuraSetupApp.removeActor,
        },
    };

    tabGroups = { sheet: "presets" };
    _editingPresetId = null;

    static PARTS = {
        main: { template: "modules/sigil-tools/submodules/visual-auras/templates/visual-aura-setup.hbs" },
    };

    async _prepareContext(options) {
        const rawPresets = getPresets();
        const actorConfig = getActorConfig();

        const presets = rawPresets.map(p => ({
            highlightMode: "shapes",
            displayMeasurements: false,
            restrictionEnabled: false,
            restrictionType: "move",
            restrictionPriority: 0,
            hole: false,
            gridBased: true,
            ...p,
        }));

        const actors = Object.entries(actorConfig).map(([name, raw]) => {
            const assignedIds = Array.isArray(raw) ? raw : (raw ? [raw] : []);
            const presetList = presets.map(p => ({ id: p.id, name: p.name, checked: assignedIds.includes(p.id) }));
            return { name, presetList };
        });

        let presetMode = "list";
        let editPreset = null;

        if (this._editingPresetId !== null) {
            presetMode = "edit";
            if (this._editingPresetId === "__new__") {
                editPreset = {
                    id: foundry.utils.randomID(),
                    name: "",
                    color: "#8888ff",
                    radius: 10,
                    visibility: "ALWAYS",
                    highlightMode: "shapes",
                    gridBased: true,
                    hole: false,
                    displayMeasurements: false,
                    restrictionEnabled: false,
                    restrictionType: "move",
                    restrictionPriority: 0,
                    isNew: true,
                };
            } else {
                editPreset = presets.find(p => p.id === this._editingPresetId);
                if (!editPreset) {
                    this._editingPresetId = null;
                    presetMode = "list";
                }
            }
        }

        return { presets, actors, presetMode, editPreset, activeTab: this.tabGroups.sheet };
    }

    async _onRender(context, options) {
        this.element.querySelectorAll("[data-actor-ms]").forEach(ms => {
            const actorName = ms.dataset.actorName;
            // Delay by one frame to skip the change the component fires on connect
            requestAnimationFrame(() => {
                ms.addEventListener("change", async e => {
                    // ms.value calls _getValue() → Array.from(this._value) (internal Set)
                    const ids = ms.value ?? [];
                    await VisualAuraSetupApp._setActorPresets.call(this, actorName, ids);
                });
            });
        });
    }

    // ─── Preset List Actions ───────────────────────────────────────────────

    static async switchTab(event, target) {
        const tab = target.dataset.tab;
        const wrapper = target.closest(".va-setup-wrapper");
        if (!wrapper) return;
        wrapper.querySelectorAll("nav a").forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
        wrapper.querySelectorAll(".tab").forEach(s => s.classList.toggle("active", s.dataset.tab === tab));
        this.tabGroups.sheet = tab;
    }

    static async editPreset(event, target) {
        this._editingPresetId = target.dataset.id;
        this.render();
    }

    static async addPreset(event, target) {
        this._editingPresetId = "__new__";
        this.render();
    }

    static async duplicatePreset(event, target) {
        const id = target.dataset.id;
        const presets = getPresets();
        const original = presets.find(p => p.id === id);
        if (!original) return;
        const copy = { ...original, id: foundry.utils.randomID(), name: `${original.name} (Copy)` };
        presets.push(copy);
        await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.PRESETS, presets);
        this.render();
    }

    static async deletePreset(event, target) {
        const id = target.dataset.id;
        const presets = getPresets().filter(p => p.id !== id);
        const actorConfig = getActorConfig();
        for (const [name, raw] of Object.entries(actorConfig)) {
            const ids = Array.isArray(raw) ? raw : (raw ? [raw] : []);
            actorConfig[name] = ids.filter(pid => pid !== id);
        }
        await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.PRESETS, presets);
        await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.ACTOR_CONFIG, actorConfig);
        await _refreshCurrentSceneAuras(presets, actorConfig);
        this.render();
    }

    // ─── Preset Edit Actions ───────────────────────────────────────────────

    static async savePreset(event, target) {
        const preset = VisualAuraSetupApp._readEditForm(this.element);
        if (!preset.name) {
            ui.notifications.warn("[Visual Auras] Preset name is required.");
            return;
        }
        const presets = getPresets();
        const idx = presets.findIndex(p => p.id === preset.id);
        if (idx >= 0) presets[idx] = preset;
        else presets.push(preset);
        await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.PRESETS, presets);
        const actorConfig = getActorConfig();
        await _refreshCurrentSceneAuras(presets, actorConfig);
        this._editingPresetId = null;
        this.render();
    }

    static async cancelEdit(event, target) {
        this._editingPresetId = null;
        this.render();
    }

    // ─── Actor Actions ─────────────────────────────────────────────────────

    static async addActor(event, target) {
        const input = this.element.querySelector(".va-new-actor-name");
        const name = input?.value?.trim();
        if (!name) { ui.notifications.warn("[Visual Auras] Actor name is required."); return; }
        const actorConfig = getActorConfig();
        if (name in actorConfig) { ui.notifications.warn("[Visual Auras] Actor already in list."); return; }
        actorConfig[name] = [];
        await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.ACTOR_CONFIG, actorConfig);
        this.render();
    }

    static async removeActor(event, target) {
        const name = target.dataset.actorName;
        const actorConfig = getActorConfig();
        delete actorConfig[name];
        await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.ACTOR_CONFIG, actorConfig);
        const presets = getPresets();
        await _refreshCurrentSceneAuras(presets, actorConfig);
        this.render();
    }

    static async _setActorPresets(actorName, presetIds) {
        const actorConfig = getActorConfig();
        actorConfig[actorName] = presetIds;
        await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.ACTOR_CONFIG, actorConfig);
        const presets = getPresets();
        await _refreshCurrentSceneAuras(presets, actorConfig);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    static _readEditForm(root) {
        const colorEl = root.querySelector('[name="edit-color"]');
        const color = colorEl?.value ?? colorEl?.querySelector('input[type="color"]')?.value ?? "#8888ff";
        return {
            id: root.querySelector('[name="edit-id"]')?.value,
            name: (root.querySelector('[name="edit-name"]')?.value ?? "").trim(),
            color,
            radius: Number(root.querySelector('[name="edit-radius"]')?.value ?? 10),
            visibility: root.querySelector('[name="edit-visibility"]')?.value ?? "ALWAYS",
            highlightMode: root.querySelector('[name="edit-highlightMode"]')?.value ?? "shapes",
            gridBased: root.querySelector('[name="edit-gridBased"]')?.checked ?? true,
            hole: root.querySelector('[name="edit-hole"]')?.checked ?? false,
            displayMeasurements: root.querySelector('[name="edit-displayMeasurements"]')?.checked ?? false,
            restrictionEnabled: root.querySelector('[name="edit-restrictionEnabled"]')?.checked ?? false,
            restrictionType: root.querySelector('[name="edit-restrictionType"]')?.value ?? "move",
            restrictionPriority: Number(root.querySelector('[name="edit-restrictionPriority"]')?.value ?? 0),
        };
    }
}

async function _refreshCurrentSceneAuras(presets, actorConfig) {
    const scene = game.canvas.scene;
    if (!scene) return;

    for (const tokenDoc of scene.tokens) {
        const actor = tokenDoc.actor;
        if (!actor) continue;

        const existingIds = findAuraRegionsForToken(scene, tokenDoc.id).map(r => r.id);
        if (existingIds.length) {
            try {
                await scene.deleteEmbeddedDocuments("Region", existingIds);
            } catch(e) {
                console.error("[visual-auras]", "_refreshCurrentSceneAuras | delete failed:", e);
            }
        }

        const actorNameLower = actor.name.toLowerCase();
        const entry = Object.entries(actorConfig).find(([k]) => k.toLowerCase() === actorNameLower);
        const raw = entry?.[1];
        const assignedPresetIds = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        if (!assignedPresetIds.length) continue;

        const actorPresets = presets.filter(p => assignedPresetIds.includes(p.id));
        if (!actorPresets.length) continue;

        const regionData = actorPresets.map(p => buildRegionData(p, tokenDoc));
        try {
            await scene.createEmbeddedDocuments("Region", regionData);
        } catch(e) {
            console.error("[visual-auras]", "_refreshCurrentSceneAuras | create failed:", e);
        }
    }
}
