import { MODULE_NAME } from "../shared/const.js";

/**
 * Ascendant Dragon-Touched Focus (Fizban's Treasury of Dragons): once per dawn, a spell of level 1
 * or higher cast while holding the focus can be treated as cast with a level 9 spell slot.
 *
 * The focus is any worn item (equipped, and attuned if it requires it) with a utility activity
 * named "Ascendant" that has a use left, such as Needle's Nail (Ascendant) in DDB Items. While one
 * is worn, the cast dialog of a level 1–8 spell gets an "Ascendant" checkbox under the spell slot.
 * Ticked, the spell is cast at level 9 while the slot picked above is still the one spent, and the
 * focus's Ascendant use is spent.
 *
 * dnd5e keeps the slot spent (usageConfig.spell.slot) and the level cast at (usageConfig.scaling)
 * apart, but its _prepareUsageScaling sets the scaling from the slot, so that method is wrapped:
 * after it runs, a ticked box raises the scaling to level 9, on the usage config, the chat message
 * and the item clone used for the card, as dnd5e itself does for an upcast.
 */

const FLAG = "rmAscendant";

function ascendantSource(actor) {
    for (const item of actor?.items ?? []) {
        if (!item.system?.equipped) continue;
        if (item.system.attunement === "required" && !item.system.attuned) continue;
        const activity = item.system.activities?.find((a) => a.type === "utility" && a.name === "Ascendant");
        if (activity && (activity.uses?.value ?? 0) > 0) return { item, activity };
    }
    return null;
}

function eligible(activity) {
    const level = activity?.item?.system?.level ?? 0;
    return !!activity?.isSpell && level >= 1 && level < 9;
}

function onRenderUsageDialog(app, element) {
    const activity = app.activity;
    if (!eligible(activity)) return;
    const source = ascendantSource(activity.actor);
    if (!source) return;
    const slot = element.querySelector('[name="spell.slot"]')?.closest(".form-group");
    if (!slot) return;
    const checked = app.config?.[FLAG] ? "checked" : "";
    const { value, max } = source.activity.uses;
    slot.insertAdjacentHTML(
        "afterend",
        `<div class="form-group rm-ascendant">
            <label>Ascendant</label>
            <div class="form-fields">
                <label class="checkbox"><input type="checkbox" name="${FLAG}" ${checked}> Cast at level 9</label>
            </div>
            <p class="hint">${foundry.utils.escapeHTML(source.item.name)}, ${value}/${max} until dawn. The slot above is still the one spent.</p>
        </div>`
    );
}

function registerScalingWrap() {
    const done = new Set();
    for (const [type, config] of Object.entries(CONFIG.DND5E.activityTypes ?? {})) {
        const cls = config?.documentClass;
        if (!cls?.prototype?._prepareUsageScaling || done.has(cls)) continue;
        done.add(cls);
        libWrapper.register(
            MODULE_NAME,
            `CONFIG.DND5E.activityTypes.${type}.documentClass.prototype._prepareUsageScaling`,
            async function (wrapped, usageConfig, messageConfig, item) {
                await wrapped(usageConfig, messageConfig, item);
                if (!usageConfig?.[FLAG]) return;
                if (!eligible(this) || !ascendantSource(this.actor)) {
                    usageConfig[FLAG] = false;
                    return;
                }
                const scaling = 9 - item.system.level;
                usageConfig.scaling = scaling;
                foundry.utils.setProperty(messageConfig, "data.system.scaling", scaling);
                if (item.flags.dnd5e?.scaling !== scaling) {
                    item.actor._embeddedPreparation = true;
                    item.updateSource({ "flags.dnd5e.scaling": scaling });
                    delete item.actor._embeddedPreparation;
                    item.prepareFinalAttributes();
                }
            },
            "WRAPPER"
        );
    }
}

async function onPostUseActivity(activity, usageConfig) {
    if (!usageConfig?.[FLAG]) return;
    const source = ascendantSource(activity.actor);
    if (!source) return;
    await source.activity.update({ "uses.spent": (source.activity.uses.spent ?? 0) + 1 });
}

Hooks.once("setup", registerScalingWrap);
Hooks.on("renderActivityUsageDialog", onRenderUsageDialog);
Hooks.on("dnd5e.postUseActivity", onPostUseActivity);
