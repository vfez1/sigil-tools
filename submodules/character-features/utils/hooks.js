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
        const disabled = isWildShaping ? disabledWhileShaped : !disabledWhileShaped;

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
