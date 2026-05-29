import { MODULE_NAME } from "../shared/const.js";
import { CoreUtility } from "../roll-model/utils/core.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const HP_RESOURCE = {
    value: "attributes.hp.value",
    temp: "attributes.hp.temp",
    max: "attributes.hp.max",
    tempMax: "attributes.hp.tempmax",
};

export class AlwaysHPWidget extends HandlebarsApplicationMixin(ApplicationV2) {
    tokenname = '';
    tokenstat = '';
    tokentemp = '';
    tokentooltip = '';
    color = "";
    valuePct = null;
    tempPct = null;

    static DEFAULT_OPTIONS = {
        id: "rm-always-hp",
        classes: ["always-hp"],
        window: {
            resizable: false,
        },
        position: {
            width: 300
        }
    }

    static PARTS = {
        main: {
            root: true,
            template: "modules/sigil-tools/templates/rm-hp.html"
        }
    };

    nonDismissible = true;

    persistPosition = foundry.utils.debounce(this.onPersistPosition.bind(this), 1000);

    _initializeApplicationOptions(options) {
        options = super._initializeApplicationOptions(options);

        let pos = game.user.getFlag(MODULE_NAME, "alwayshpPos");
        options.position.top = pos?.top || 60;
        options.position.left = pos?.left || ($('#board').width() / 2 - 150);

        return options;
    }

    async _renderFrame(options) {
        const frame = await super._renderFrame(options);

        const header_html = await foundry.applications.handlebars.renderTemplate(
            "modules/sigil-tools/templates/rm-hp-header.html", this
        );

        $('.window-header', frame)
            .empty()
            .addClass('flexrow')
            .append(header_html);

        return frame;
    }

    setPosition(position) {
        position = super.setPosition(position);
        this.persistPosition(position);
        return position;
    }

    _onRender(context, options) {
        super._onRender(context, options);

        this.refreshSelected();

        let html = $(this.element);

        html.find('#alwayshp-btn-dead').click(ev => {
            ev.preventDefault();
            if (ev.shiftKey == true)
                this.changeHP(0, null, 'toggle');
            else {
                this.changeHP('zero', null, true);
                this.clearInput();
            }
        }).contextmenu(ev => {
            ev.preventDefault();
            this.changeHP('zero');
            this.clearInput();
        });

        html.find('#alwayshp-btn-hurt').click(ev => {
            ev.preventDefault();
            let data = this.parseValue;
            if (data.value != '') {
                data.value = Math.abs(data.value);
                this.changeHP(data.value, data.target);
            }
            this.clearInput();
        });

        html.find('#alwayshp-btn-heal').click(ev => {
            ev.preventDefault();
            let data = this.parseValue;
            if (data.value != '') {
                data.value = -Math.abs(data.value);
                this.changeHP(data.value, data.target, false);
            }
            this.clearInput();
        });

        html.find('#alwayshp-btn-fullheal').click(ev => {
            ev.preventDefault();
            this.changeHP('full', null, false);
            this.clearInput();
        }).contextmenu(ev => {
            ev.preventDefault();
            this.changeHP('full');
            this.clearInput();
        });

        html.find('#alwayshp-hp').focus(ev => {
            ev.preventDefault();
            let elem = ev.target;
            if (elem.setSelectionRange) {
                elem.focus();
                elem.setSelectionRange(0, $(elem).val().length);
            } else if (elem.createTextRange) {
                var range = elem.createTextRange();
                range.collapse(true);
                range.moveEnd('character', $(elem).val().length);
                range.moveStart('character', 0);
                range.select();
            }
        }).keypress(ev => {
            if (ev.which == 13) {
                let data = this.parseValue;
                if (data.value != '' && data.value != 0) {
                    ev.preventDefault();

                    let rawvalue = $('#alwayshp-hp', this.element).val();

                    data.value = rawvalue.startsWith('+') ? -Math.abs(data.value) : Math.abs(data.value);
                    this.changeHP(data.value, data.target);
                    this.clearInput();
                }
            }
        });

        html.find('.death-savingthrow').click(ev => {
            ev.preventDefault();
            this.addDeathST($(ev.currentTarget).hasClass('save'), 1);
        }).contextmenu(ev => {
            ev.preventDefault();
            this.addDeathST($(ev.currentTarget).hasClass('save'), -1);
        });

    }

    async close(options) {
        if (options?.properClose) {
            super.close(options);
            HPManager.app = null;
        }
    }

    getData() {
        return {
            tokenname: this.tokenname
        };
    }

    getResourceValue(actor, resourceName) {
        if (resourceName == "" || resourceName.startsWith("."))
            return 0;
        return parseInt(foundry.utils.getProperty(actor, `system.${resourceName}`) ?? 0);
    }

    async changeHP(value = 0, target = null, addStatus = null) {
        let actors = canvas.tokens.controlled.flatMap((t) => {
            if (t.actor?.type == "group") {
                return Array.from(t.actor?.system.members);
            } else
                return t.actor;
        });

        for (let a of actors) {
            if (!a || !(a instanceof Actor)) continue;

            let tValue = (value?.toObject?.() ?? foundry.utils.deepClone(value));

            let resourceValue = this.getResourceValue(a, HP_RESOURCE.value);

            if (value == 'zero') {
                let tempValue = this.getResourceValue(a, HP_RESOURCE.temp);
                tValue = resourceValue + tempValue;
            } else if (value == 'full') {
                let maxValue = this.getResourceValue(a, HP_RESOURCE.max);
                let tempMaxValue = this.getResourceValue(a, HP_RESOURCE.tempMax);
                tValue = resourceValue - (maxValue + tempMaxValue);
            }

            let defeatedStatus = CONFIG.specialStatusEffects.DEFEATED;

            if (addStatus != null) {
                const exists = a.statuses.has(defeatedStatus);
                if (exists != addStatus) {
                    await a.toggleStatusEffect(defeatedStatus, { active: addStatus === 'toggle' ? !exists : addStatus });
                }
            }

            if (addStatus === false) {
                a.update({
                    "system.attributes.death.failure": 0,
                    "system.attributes.death.success": 0
                });
            }

            if (tValue != 0) {
                await this.applyDamage(a, tValue, target);
            }
        }

        this.refreshSelected();
    }

    async applyDamage(actor, value, target) {
        let updates = {};
        let resourceValue = this.getResourceValue(actor, HP_RESOURCE.value);
        let tempValue = this.getResourceValue(actor, HP_RESOURCE.temp);
        let maxValue = this.getResourceValue(actor, HP_RESOURCE.max);
        let tempMaxValue = this.getResourceValue(actor, HP_RESOURCE.tempMax);

        if (tempMaxValue && target == "max") {
            const dm = tempMaxValue - value;
            updates[`system.${HP_RESOURCE.tempMax}`] = dm;
        } else {
            let dt = 0;
            let tmpMax = tempMaxValue;
            if (tempValue || target == 'temp') {
                dt = (value > 0 || target == 'temp') && target != 'regular' && target != 'max' ? Math.min(tempValue, value) : 0;
                updates[`system.${HP_RESOURCE.temp}`] = tempValue - dt;
            }

            if (target != 'temp' && target != 'max' && dt >= 0) {
                let change = (value - dt);
                const dh = Math.clamp(resourceValue - change, 0, maxValue + tmpMax);
                updates[`system.${HP_RESOURCE.value}`] = dh;
            }
        }

        return await actor.update(updates);
    }

    refreshSelected() {
        this.valuePct = null;
        this.tokenstat = "";
        this.tokentemp = "";
        this.tokentooltip = "";
        $('.character-name', this.element).removeClass("single");

        if (canvas.tokens?.controlled.length == 0) {
            this.tokenname = "";
        } else if (canvas.tokens?.controlled.length == 1) {
            let a = canvas.tokens.controlled[0].actor;
            if (!a) {
                this.tokenname = "";
            } else {
                $('.character-name', this.element).addClass("single");
                let resourceValue = this.getResourceValue(a, HP_RESOURCE.value);
                let maxValue = this.getResourceValue(a, HP_RESOURCE.max);
                let tempValue = this.getResourceValue(a, HP_RESOURCE.temp);
                let tempMaxValue = this.getResourceValue(a, HP_RESOURCE.tempMax);

                const effectiveMax = Math.max(0, maxValue + tempMaxValue);
                let displayMax = maxValue + (tempMaxValue > 0 ? tempMaxValue : 0);

                const tempPct = Math.clamp(tempValue, 0, displayMax) / displayMax;
                const valuePct = Math.clamp(resourceValue, 0, effectiveMax) / displayMax;

                this.valuePct = valuePct;
                this.tempPct = tempPct;
                const color = [(1 - (this.valuePct / 2)), this.valuePct, 0];
                this.color = `rgba(${parseInt(color[0] * 255)},${parseInt(color[1] * 255)},${parseInt(color[2] * 255)}, 0.7)`;

                this.tokenname = canvas.tokens.controlled[0]?.name ?? canvas.tokens.controlled[0]?.data?.name;
                this.tokenstat = resourceValue;
                this.tokentemp = tempValue;
                this.tokentooltip = `HP: ${resourceValue}, Temp: ${tempValue}, Max: ${maxValue}`;
            }
        } else {
            this.tokenname = `Multiple <span class="count">${canvas.tokens.controlled.length}</span>`;
        }

        this.changeToken();
    }

    addDeathST(save, value) {
        if (canvas.tokens.controlled.length == 1) {
            let a = canvas.tokens.controlled[0].actor;
            if (!a) return;

            let prop = a.system.attributes.death;
            prop[save ? 'success' : 'failure'] = Math.max(0, Math.min(3, prop[save ? 'success' : 'failure'] + value));

            let updates = {};
            updates["system.attributes.death." + (save ? 'success' : 'failure')] = prop[save ? 'success' : 'failure'];
            canvas.tokens.controlled[0].actor.update(updates);

            this.changeToken();
        }
    }

    changeToken() {
        if (!this.element) return;
        $('.character-name', this.element).html(this.tokenname);
        $('.token-stats', this.element).attr('title', this.tokentooltip).html(
            (this.tokentemp ? `<div class="stat temp">${this.tokentemp}</div>` : '') +
            (this.tokenstat ? `<div class="stat" style="background-color:${this.color}">${this.tokenstat}</div>` : '')
        );

        let actor = (canvas.tokens.controlled.length == 1 ? canvas.tokens.controlled[0].actor : null);
        let data = actor?.system;
        let showST = (actor != undefined && data?.attributes?.hp?.value == 0 && actor?.hasPlayerOwner);
        $('.death-savingthrow', this.element).css({ display: (showST ? 'inline-block' : 'none') });
        if (showST && data.attributes.death) {
            $('.death-savingthrow.fail > div', this.element).each(function (idx) { $(this).toggleClass('active', idx < data.attributes.death.failure) });
            $('.death-savingthrow.save > div', this.element).each(function (idx) { $(this).toggleClass('active', idx < data.attributes.death.success) });
        }

        $('.resource', this.element).toggle(canvas.tokens.controlled.length == 1 && this.valuePct != undefined);
        if (this.valuePct != undefined) {
            $('.resource .bar', this.element).css({ width: (this.valuePct * 100) + '%', backgroundColor: this.color });
            $('.resource .temp-bar', this.element).toggle(this.tempPct > 0).css({ width: (this.tempPct * 100) + '%' });
        }
    }

    get parseValue() {
        let value = $('#alwayshp-hp', this.element).val();
        let result = { value: value };
        if (value.indexOf("r") > -1 || value.indexOf("R") > -1) {
            result.target = "regular";
            result.value = result.value.replace('r', '').replace('R', '');
        }
        if (value.indexOf("t") > -1 || value.indexOf("T") > -1) {
            result.target = "temp";
            result.value = result.value.replace('t', '').replace('T', '');
        }
        if (value.indexOf("m") > -1 || value.indexOf("M") > -1) {
            result.target = "max";
            result.value = result.value.replace('m', '').replace('M', '');
        }

        result.value = parseInt(result.value);
        if (isNaN(result.value)) result.value = 1;
        return result;
    }

    clearInput() {
        $('#alwayshp-hp', this.element).val('');
    }

    onPersistPosition(position) {
        game.user.setFlag(MODULE_NAME, "alwayshpPos", { left: position.left, top: position.top });
    }

    static canLoad() {
        return true;
    }
}

export const HPManager = {
    app: null,

    toggleApp(show = 'toggle') {
        if (show === 'toggle') show = !this.app;

        if (show && !this.app) {
            this.app = new AlwaysHPWidget();
            this.app.render(true);
        } else if (!show && this.app) {
            this.app.close({ properClose: true });
        }
    },

    refresh() {
        if (this.app) this.app.refreshSelected();
    }
};

export function applyHPDismissPatch() {
    if (CoreUtility.hasModule("monks-active-tiles")) return;

    const proto = foundry.helpers.interaction.ClientKeybindings.prototype;
    const original = proto._registerCoreKeybindings;

    proto._registerCoreKeybindings = function (...args) {
        let result = original.call(this, ...args);

        game.keybindings.actions.get("core.dismiss").onDown = async function (context) {
            if (canvas.currentMouseManager) {
                canvas.currentMouseManager.interactionData.cancelled = true;
                canvas.currentMouseManager.cancel();
                return true;
            }

            if (canvas.ready) canvas.fog.commit();

            if (ui.context?.element) {
                await ui.context.close();
                return true;
            }

            if (foundry.nue.Tour.tourInProgress) {
                foundry.nue.Tour.activeTour.exit();
                return true;
            }

            const closingApps = [];
            for (const app of Object.values(ui.windows)) {
                closingApps.push(app.close({ closeKey: true }).then(() => !app.rendered));
            }
            for (const app of foundry.applications.instances.values()) {
                if (app.hasFrame && !app.nonDismissible) closingApps.push(app.close({ closeKey: true }).then(() => !app.rendered));
            }
            const closedApp = (await Promise.all(closingApps)).some(c => c);
            if (closedApp) return true;

            if (game.view !== "game") return;
            const layer = canvas.activeLayer;
            if (layer instanceof foundry.canvas.layers.InteractionLayer) {
                if (layer._onDismissKey(context.event)) return true;
            }

            ui.menu.toggle();
            if (canvas.ready) await canvas.fog.save();
            return true;
        };

        return result;
    };
}
