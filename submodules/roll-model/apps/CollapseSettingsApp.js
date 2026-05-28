import { MODULE_NAME } from "../../shared/const.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CollapseSettingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "rm-collapse-settings",
        classes: ["standard-form"],
        tag: "div",
        position: { width: 420, height: "auto" },
        window: {
            title: "Collapse Settings",
            icon: "fas fa-compress",
            resizable: false,
        },
        actions: {
            addException: CollapseSettingsApp.addException,
            removeException: CollapseSettingsApp.removeException,
        },
    };

    static PARTS = {
        main: { template: "modules/sigil-tools/submodules/roll-model/templates/collapse-settings.hbs" },
    };

    async _prepareContext(options) {
        const exceptions = game.settings.get(MODULE_NAME, "collapseDescriptionExceptions") ?? [];
        return { exceptions: [...exceptions].sort((a, b) => a.localeCompare(b)) };
    }

    async _onRender(context, options) {
        this.setPosition({ height: "auto" });
        const input = this.element.querySelector('[name="new-exception"]');
        input?.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            CollapseSettingsApp.addException.call(this, e, this.element.querySelector('[data-action="addException"]'));
        });
    }

    static async addException(event, target) {
        const input = this.element.querySelector('[name="new-exception"]');
        const name = input?.value?.trim();
        if (!name) return;
        const exceptions = game.settings.get(MODULE_NAME, "collapseDescriptionExceptions") ?? [];
        if (!exceptions.some(e => e.toLowerCase() === name.toLowerCase())) {
            exceptions.push(name);
            await game.settings.set(MODULE_NAME, "collapseDescriptionExceptions", exceptions);
        }
        this.render();
    }

    static async removeException(event, target) {
        const name = target.dataset.exception;
        const exceptions = (game.settings.get(MODULE_NAME, "collapseDescriptionExceptions") ?? []).filter(e => e !== name);
        await game.settings.set(MODULE_NAME, "collapseDescriptionExceptions", exceptions);
        this.render();
    }
}
