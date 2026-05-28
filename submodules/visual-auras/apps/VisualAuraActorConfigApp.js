import { MODULE_NAME } from "../../shared/const.js";
import { VA_SETTING_NAMES, getPresets, getActorConfig } from "../utils/settings.js";
import { refreshCurrentSceneAuras } from "../utils/helpers.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class VisualAuraActorConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "visual-aura-actor-config",
        classes: ["standard-form", "visual-aura-actor-config"],
        tag: "div",
        position: { width: 536, height: "auto" },
        window: {
            title: "Visual Aura Actor Configuration",
            icon: "fas fa-users",
            resizable: false,
        },
        actions: {
            addActor: VisualAuraActorConfigApp.addActor,
            removeActor: VisualAuraActorConfigApp.removeActor,
        },
    };

    static PARTS = {
        main: { template: "modules/sigil-tools/submodules/visual-auras/templates/visual-aura-actor-config.hbs" },
    };

    async _prepareContext(options) {
        const rawPresets = getPresets();
        const actorConfig = getActorConfig();

        const presets = rawPresets.map(p => ({ id: p.id, name: p.name }));

        const actors = Object.entries(actorConfig).map(([name, raw]) => {
            const assignedIds = Array.isArray(raw) ? raw : (raw ? [raw] : []);
            const presetList = presets.map(p => ({ id: p.id, name: p.name, checked: assignedIds.includes(p.id) }));
            return { name, presetList };
        });

        return { actors };
    }

    async _onRender(context, options) {
        this.element.querySelectorAll("[data-actor-ms]").forEach(ms => {
            const actorName = ms.dataset.actorName;
            requestAnimationFrame(() => {
                ms.addEventListener("change", async () => {
                    const ids = ms.value ?? [];
                    const actorConfig = getActorConfig();
                    actorConfig[actorName] = ids;
                    await game.settings.set(MODULE_NAME, VA_SETTING_NAMES.ACTOR_CONFIG, actorConfig);
                    await refreshCurrentSceneAuras();
                });
            });
        });

        this.setPosition({ height: "auto" });
    }

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
        await refreshCurrentSceneAuras();
        this.render();
    }
}
