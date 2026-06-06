import { getConfig } from "./settings.js";

export function registerHooks() {
    // Beast form actor is created after transformActorV2 fires, so we hook createActor instead.
    Hooks.on("createActor", (actor) => {
        if (!actor.getFlag("dnd5e", "isPolymorphed")) return;
        const originalId = actor.getFlag("dnd5e", "originalActor");
        const original = originalId ? game.actors.get(originalId) : null;
        _dispatchWildshapeToggle(actor, true, original);
    });

    Hooks.on("dnd5e.revertOriginalForm", (actor) => {
        const originalId = actor.getFlag("dnd5e", "originalActor");
        const original = originalId ? game.actors.get(originalId) : null;
        if (!original) return;
        _dispatchWildshapeToggle(original, false, original);
    });

    Hooks.on("updateItem", (item, change) => {
        if (!("attuned" in (change.system ?? {}))) return;
        const actor = item.parent;
        if (!actor) return;
        _dispatchAttunementToggle(actor, item.name, change.system.attuned);
    });
}

function _dispatchAttunementToggle(actor, itemName, nowAttuned) {
    const config = getConfig();
    const actorName = actor.name ?? "";

    for (const charConfig of Object.values(config)) {
        if (!charConfig.enabled) continue;
        if (!charConfig.actorName) continue;
        if (actorName.toLowerCase() !== charConfig.actorName.toLowerCase()) continue;
        if (!charConfig.wildshape?.length) continue;

        const affected = charConfig.wildshape.filter(
            (e) => e.attuned && itemName.startsWith(e.attuned)
        );
        if (!affected.length) continue;

        _applyAttunementToggle(actor, nowAttuned, affected);
    }
}

async function _applyAttunementToggle(actor, nowAttuned, effectConfigs) {
    const actorEffects = [...actor.effects];
    const actorEffectNames = new Set(actorEffects.map((e) => e.name));
    const itemEffects = [...actor.items].flatMap((i) => [...i.effects]).filter((e) => !actorEffectNames.has(e.name));
    const candidates = [...actorEffects, ...itemEffects];
    const updatesByParent = new Map();
    const log = [];

    const isWildShaped = game.actors.some(
        (a) => a.getFlag("dnd5e", "isPolymorphed") && a.getFlag("dnd5e", "originalActor") === actor.id
    );

    for (const { name, disabledWhileShaped } of effectConfigs) {
        const matches = candidates.filter((e) => e.name === name);
        if (!matches.length) {
            log.push(`Not found: <em>${name}</em>`);
            continue;
        }
        const disabled = !nowAttuned
            ? true
            : disabledWhileShaped === "always-on" ? false : isWildShaped ? disabledWhileShaped : !disabledWhileShaped;

        for (const eff of matches) {
            if (eff.disabled === disabled) {
                log.push(`${eff.name} — already ${disabled ? "off" : "on"}`);
                continue;
            }
            if (!updatesByParent.has(eff.parent)) updatesByParent.set(eff.parent, []);
            updatesByParent.get(eff.parent).push({ _id: eff.id, disabled });
            log.push(`${eff.name} → <strong>${disabled ? "off" : "on"}</strong>`);
        }
    }

    for (const [parent, updates] of updatesByParent) {
        await parent.updateEmbeddedDocuments("ActiveEffect", updates);
    }

    if (log.length) {
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<strong>${actor.name} — ${nowAttuned ? "Attuned" : "Unattuned"}</strong><br>${log.join("<br>")}`,
        });
    }
}

function _dispatchWildshapeToggle(actor, isWildShaping, originalActor) {
    const config = getConfig();
    const originalName = originalActor?.name ?? "";

    for (const charConfig of Object.values(config)) {
        if (!charConfig.enabled) continue;
        if (!charConfig.actorName) continue;
        if (originalName.toLowerCase() !== charConfig.actorName.toLowerCase()) continue;
        if (!charConfig.wildshape?.length) continue;

        _applyWildshapeEffectToggle(actor, isWildShaping, originalActor, charConfig.wildshape);
    }
}

async function _applyWildshapeEffectToggle(actor, isWildShaping, attunementActor, effectConfigs) {
    const actorEffects = [...actor.effects];
    const actorEffectNames = new Set(actorEffects.map((e) => e.name));
    const itemEffects = [...actor.items].flatMap((i) => [...i.effects]).filter((e) => !actorEffectNames.has(e.name));
    const candidates = [...actorEffects, ...itemEffects];
    const updatesByParent = new Map();
    const log = [];

    for (const effectConfig of effectConfigs) {
        const { name, disabledWhileShaped, attuned } = effectConfig;
        const disabled = disabledWhileShaped === "always-on" ? false : isWildShaping ? disabledWhileShaped : !disabledWhileShaped;

        const matches = candidates.filter((e) => e.name === name);
        if (!matches.length) {
            log.push(`Not found: <em>${name}</em>`);
            continue;
        }

        for (const eff of matches) {
            if (attuned) {
                const item = attunementActor?.items.find((i) => i.name.startsWith(attuned));
                if (!item?.system?.attuned) {
                    log.push(`${eff.name} — skipped (not attuned)`);
                    continue;
                }
            }

            if (eff.disabled === disabled) {
                log.push(`${eff.name} — already ${disabled ? "off" : "on"}`);
                continue;
            }

            if (!updatesByParent.has(eff.parent)) updatesByParent.set(eff.parent, []);
            updatesByParent.get(eff.parent).push({ _id: eff.id, disabled });
            log.push(`${eff.name} → <strong>${disabled ? "off" : "on"}</strong>`);
        }
    }

    for (const [parent, updates] of updatesByParent) {
        await parent.updateEmbeddedDocuments("ActiveEffect", updates);
    }

    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<strong>${actor.name} — ${isWildShaping ? "Wild Shape" : "Restore form"}</strong><br>${log.join("<br>")}`,
    });
}
