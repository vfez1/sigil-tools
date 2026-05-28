import { MODULE_NAME } from "../../shared/const.js";
import { VA_SETTING_NAMES, getPresets, getActorConfig } from "../utils/settings.js";
import { buildRegionData, findAuraRegionsForToken, getPresetsForToken, refreshCurrentSceneAuras } from "../utils/helpers.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class VisualAuraSetupApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "visual-aura-setup",
        classes: ["standard-form", "visual-aura-setup"],
        tag: "div",
        position: { width: 536, height: "auto" },
        window: {
            title: "Visual Aura Setup",
            icon: "fas fa-circle-dashed",
            resizable: false,
        },
        actions: {
            editPreset: VisualAuraSetupApp.editPreset,
            addPreset: VisualAuraSetupApp.addPreset,
            duplicatePreset: VisualAuraSetupApp.duplicatePreset,
            deletePreset: VisualAuraSetupApp.deletePreset,
            savePreset: VisualAuraSetupApp.savePreset,
            cancelEdit: VisualAuraSetupApp.cancelEdit,
            toggleDefaultEnabled: VisualAuraSetupApp.toggleDefaultEnabled,
        },
    };

    _editingPresetId = null;

    static PARTS = {
        main: { template: "modules/sigil-tools/submodules/visual-auras/templates/visual-aura-setup.hbs" },
    };

    async _prepareContext(options) {
        const rawPresets = getPresets();

        const presets = rawPresets.map(p => ({
            highlightMode: "shapes",
            displayMeasurements: false,
            restrictionEnabled: false,
            restrictionType: "move",
            restrictionPriority: 0,
            hole: false,
            gridBased: true,
            defaultEnabled: false,
            ...p,
        })).sort((a, b) => a.name.localeCompare(b.name));

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
                    defaultEnabled: false,
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

        return { presets, presetMode, editPreset };
    }

    async _onRender(context, options) {
        // Auto-save when editing an existing preset (not a new one)
        if (this._editingPresetId && this._editingPresetId !== "__new__") {
            const presetId = this._editingPresetId;
            const autoSave = async () => {
                await VisualAuraSetupApp._autoSavePreset(this.element, presetId);
            };
            this.element.querySelectorAll('input[name^="edit-"], select[name^="edit-"]').forEach(el => {
                el.addEventListener("change", autoSave);
            });
            this.element.querySelector('[name="edit-color"]')?.querySelectorAll("input").forEach(el => {
                el.addEventListener("change", autoSave);
            });
        }

        this.setPosition({ height: "auto" });
    }

    // ─── Preset List Actions ───────────────────────────────────────────────

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
        await refreshCurrentSceneAuras();
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
        await refreshCurrentSceneAuras();
        this._editingPresetId = null;
        this.render();
    }

    static async cancelEdit(event, target) {
        this._editingPresetId = null;
        this.render();
    }

    static async toggleDefaultEnabled(event, target) {
        const id = target.dataset.id;
        const presets = getPresets();
        const preset = presets.find(p => p.id === id);
        if (!preset) return;
        preset.defaultEnabled = !preset.defaultEnabled;
        await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.PRESETS, presets);
        this.render();
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    static async _autoSavePreset(root, presetId) {
        const preset = VisualAuraSetupApp._readEditForm(root);
        if (!preset.name) return;
        const presets = getPresets();
        const idx = presets.findIndex(p => p.id === presetId);
        if (idx < 0) return;
        presets[idx] = preset;
        await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.PRESETS, presets);
        await refreshCurrentSceneAuras();
    }

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
            defaultEnabled: root.querySelector('[name="edit-defaultEnabled"]')?.checked ?? false,
        };
    }
}
