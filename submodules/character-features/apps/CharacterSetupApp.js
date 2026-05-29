import { MODULE_NAME } from "../../shared/const.js";
import { CF_SETTING_NAMES, getConfig } from "../utils/settings.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharacterSetupApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "character-features-setup",
        classes: ["standard-form", "cf-setup"],
        tag: "form",
        form: {
            handler: CharacterSetupApp.formHandler,
            closeOnSubmit: true,
        },
        position: { width: 540, height: "auto" },
        window: {
            title: "Character Setup",
            icon: "fas fa-user-gear",
            resizable: true,
        },
        actions: {
            addEffect: CharacterSetupApp.addEffect,
            removeEffect: CharacterSetupApp.removeEffect,
        },
    };

    tabGroups = { characters: "wabu" };

    static PARTS = {
        main: { template: "modules/sigil-tools/templates/character-features/setup.hbs" },
    };

    async _prepareContext(options) {
        const config = getConfig();
        const active = this.tabGroups.characters;

        return {
            characters: [
                { id: "wabu", label: "Wabu", icon: "fas fa-paw", cssClass: active === "wabu" ? "active" : "" },
            ],
            wabu: {
                enabled: config.wabu?.enabled ?? true,
                actorName: config.wabu?.actorName ?? "Wabu",
                wildshape: (config.wabu?.wildshape ?? []).map((e) => ({
                    ...e,
                    modeDisable: e.disabledWhileShaped === true,
                    modeEnable: e.disabledWhileShaped === false,
                    modeAlwaysOn: e.disabledWhileShaped === "always-on",
                })),
                cssClass: active === "wabu" ? "active" : "",
            },
        };
    }

    static async addEffect(event, target) {
        const list = target.closest(".cf-tab-body").querySelector(".cf-effect-list");
        if (!list) return;
        list.insertAdjacentHTML("beforeend", CharacterSetupApp._effectRowHtml());
    }

    static async removeEffect(event, target) {
        target.closest(".cf-effect-row").remove();
    }

    static _effectRowHtml(effect = {}) {
        const name = effect.name ?? "";
        const raw = effect.disabledWhileShaped ?? true;
        const attuned = effect.attuned ?? "";
        return `<div class="cf-effect-row">
            <input type="text" name="wabu-effect-name" value="${name}" placeholder="Effect name" />
            <select name="wabu-effect-disabled">
                <option value="true" ${raw === true ? "selected" : ""}>Disable</option>
                <option value="false" ${raw === false ? "selected" : ""}>Enable</option>
                <option value="always-on" ${raw === "always-on" ? "selected" : ""}>Always On</option>
            </select>
            <input type="text" name="wabu-effect-attuned" value="${attuned}" placeholder="Item name (optional)" />
            <button type="button" data-action="removeEffect" title="Remove"><i class="fas fa-trash"></i></button>
        </div>`;
    }

    static async formHandler(event, form, formData) {
        const data = formData.object;
        const config = getConfig();

        config.wabu = {
            enabled: data["wabu-enabled"] === true || data["wabu-enabled"] === "on",
            actorName: String(data["wabu-actorName"] ?? "Wabu").trim(),
            wildshape: _collectEffects(data, "wabu"),
        };

        await game.settings.set(MODULE_NAME, CF_SETTING_NAMES.CHARACTER_CONFIG, config);
    }
}

function _collectEffects(data, key) {
    const names = [].concat(data[`${key}-effect-name`] ?? []);
    const disableds = [].concat(data[`${key}-effect-disabled`] ?? []);
    const attuneds = [].concat(data[`${key}-effect-attuned`] ?? []);

    return names
        .map((name, i) => {
            const raw = String(disableds[i]);
            const disabledWhileShaped = raw === "always-on" ? "always-on" : raw === "true";
            const effect = { name: name.trim(), disabledWhileShaped };
            const attuned = attuneds[i]?.trim();
            if (attuned) effect.attuned = attuned;
            return effect;
        })
        .filter((e) => e.name);
}
