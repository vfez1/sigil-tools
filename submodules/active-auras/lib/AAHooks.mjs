/* eslint-disable no-unused-vars */
import { AAHelpers } from "./AAHelpers.mjs";
import { ActiveAuras } from "./ActiveAuras.mjs";
import { CollateAuras, generateConfigMap } from "./CollateAuras.mjs";
import Logger from "./Logger.mjs";
import { getAASetting } from "../settings.mjs";


/**
 *
 * @param {String} sceneID Scene to check upon
 * @param {Boolean} checkAuras Can apply auras
 * @param {Boolean} removeAuras Can remove auras
 * @param {String} source For console logging
 * @returns
 */
function addToCollateSemaphore(sceneID, checkAuras, removeAuras, source) {
  CONFIG.AA.Semaphore.add(CollateAuras, sceneID, checkAuras, removeAuras, source);
}

// Tracks scenes where preDeleteTokenHook's removeEmittedAurasFromSource is still
// in-flight. deleteTokenHook fires while the await is pending, so we skip the
// removeAuras pass to avoid a double-delete race against the in-progress cleanup.
//
// Reference-counted (sceneId -> pending count) rather than a plain Set: a single
// batch delete of multiple aura sources on the same scene runs several
// removeEmittedAurasFromSource passes concurrently, and a Set keyed by sceneId
// would let the FIRST pass to finish clear the flag while later passes are still
// in flight. The count keeps the scene flagged until every source pass completes.
// (The per-delete existence guards make this non-critical for correctness, but
// it avoids needless redundant removal work mid-batch.)
const _sourceCleanupInProgress = new Map();

function markSourceCleanupStart(sceneId) {
  _sourceCleanupInProgress.set(sceneId, (_sourceCleanupInProgress.get(sceneId) ?? 0) + 1);
}

function markSourceCleanupEnd(sceneId) {
  const remaining = (_sourceCleanupInProgress.get(sceneId) ?? 0) - 1;
  if (remaining > 0) _sourceCleanupInProgress.set(sceneId, remaining);
  else _sourceCleanupInProgress.delete(sceneId);
}

export async function createTokenHook(token, _config, _id) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  try {
    await (foundry.canvas?.animation?.CanvasAnimation ?? CanvasAnimation).getAnimation(token.object?.animationName)?.promise;
    if (foundry.utils.getProperty(token, "flags.multilevel-tokens")) return;
    const tokenEffects = Array.from(token.actor?.allApplicableEffects() ?? []);
    let isSource = false;
    for (let effect of (tokenEffects ?? [])) {
      if (effect.flags.ActiveAuras?.isAura) {
        isSource = true;
        Logger.debug("createToken, collate auras true false");

        const debouncedCollate = foundry.utils.debounce(async () => {
          addToCollateSemaphore(canvas.id, true, false, "createTokenCollate");
          // wait to allow token to be placed on canvas and report
        }, 500);

        debouncedCollate(token);

        break;
      }
    }

    // Target-side reconciliation: the source-discovery branch above only
    // fires when the dropped token is itself an aura emitter. When a player
    // (or GM) drags a target token from its actor sheet onto a scene, the
    // actor's previously-applied aura effects come along for the ride
    // because they live on the shared actor record. If no source for those
    // auras is present on the destination scene, the effect is unsupported
    // here and should be cleaned up. ReconcileAppliedAurasOnToken handles
    // dual-present sources correctly (preserved when the source actor has a
    // token on this scene too).
    CONFIG.AA.Semaphore.add(AAHelpers.ReconcileAppliedAurasOnToken, token);

    // Reconcile handles the "source actor absent from destination scene" half
    // of the problem. The OTHER half is "source actor IS present on this
    // scene, but the new token was dropped outside the aura's range" -- in
    // that case Reconcile correctly preserves the effect (the source actor
    // is here), but nothing else runs to re-evaluate distance for the new
    // token. Schedule a single-token MainAura so the dropped target gets
    // evaluated against this scene's effectMap; for any in-effectMap source
    // the new token isn't in range of, MainAura's per-target add=false path
    // calls RemoveActiveEffects (which doesn't apply the scene-tag filter)
    // and strips the stale effect.
    //
    // Skipped when the dropped token is itself a source -- the source-drop
    // branch above already schedules a full CollateAuras (which iterates all
    // tokens), so a single-token pass would be redundant.
    //
    // Debounced like the source-drop path to give the canvas a render frame
    // to register the new placeable before MainAura's canvas.tokens.get()
    // distance checks run.
    if (!isSource) {
      const debouncedSingleEval = foundry.utils.debounce(() => {
        CONFIG.AA.Semaphore.add(ActiveAuras.MainAura, token, "createToken", token.parent.id);
      }, 500);
      debouncedSingleEval(token);
    }
  } catch (error) {
    if (error.message === "Cannot read property 'effects' of null")
      Logger.error(token, "This token has a no actor linked to it, please cleanup this token");
  }
}

export async function updateCombatHook(combat, changed, options, userId) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  if (changed.round === 1) {
    // Same Semaphore as movementUpdate/CollateAuras so combat-start cannot
    // race a concurrent movement hook into duplicate aura applications.
    CONFIG.AA.Semaphore.add(ActiveAuras.MainAura, undefined, "combat start", canvas.id);
    return;
  }
  if (!("turn" in changed)) return;
  let combatant = canvas.tokens.get(combat.current.tokenId);
  let previousCombatant = canvas.tokens.get(combat.previous.tokenId);
  if (previousCombatant) await previousCombatant.document.update({ "flags.ActiveAuras": false });
  if (combatant) {
    Logger.debug("updateCombat, main aura");
    await CONFIG.AA.Semaphore.add(ActiveAuras.MainAura, combatant.document, "combat update", combatant.scene.id);
  }
}

export async function preDeleteTokenHook(token) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  const isAuraSource = AAHelpers.IsAuraToken(token.id, token.parent.id);
  if (isAuraSource) {
    Logger.debug("preDelete, collate auras false true");
    // Flag the scene BEFORE awaiting so deleteTokenHook (which fires while we
    // await) can see the in-progress cleanup and skip its removeAuras pass.
    markSourceCleanupStart(token.parent.id);
    try {
      // Remove the effects this source emitted to OTHER actors first, while the
      // document is still in the collection and the effectMap still carries the
      // source's origins. ExtractAuraById (below) clears those origins, and the
      // post-delete CollateAuras pass can't be relied on -- the deleted token's
      // PIXI placeable lingers a frame, so generateConfigMap re-adds the source's
      // aura and RemoveAppliedAuras then preserves the orphaned target effects.
      await AAHelpers.removeEmittedAurasFromSource(token);
      AAHelpers.ExtractAuraById(token.id, token.parent.id);
    } finally {
      // Always decrement, even if cleanup throws, so the scene can't get stuck
      // flagged and permanently suppress deleteTokenHook's removeAuras pass.
      markSourceCleanupEnd(token.parent.id);
    }
  }
  await AAHelpers.removeAurasOnToken(token);
}

export async function deleteTokenHook() {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  // If preDeleteTokenHook's removeEmittedAurasFromSource is still in-flight for
  // this scene, skip removeAuras to avoid racing its in-progress delete.
  const removeAuras = !_sourceCleanupInProgress.has(canvas.scene.id);
  addToCollateSemaphore(canvas.scene.id, true, removeAuras, "deleteTokenHook");
}

/**
 * On token movement run MainAura
 */
export async function updateTokenHook(token, update, _flags, _id) {
  Logger.debug("updateTokenHookArgs", { token: (token?.toObject?.() ?? foundry.utils.deepClone(token)), update, _flags, _id, liveToken: token.object?._animation });
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }

  if ("y" in update || "x" in update || "elevation" in update) {
    // await token.object._animation;
    if (token.object?.movementAnimationPromise) {
      await token.object.movementAnimationPromise;
    }
    const animationName = token.object?.animationName;
    if (animationName) await (foundry.canvas?.animation?.CanvasAnimation ?? CanvasAnimation).getAnimation(animationName)?.promise;
    await ActiveAuras.movementUpdate(token);
  } else if (foundry.utils.hasProperty(update, "hidden") && (!update.hidden || AAHelpers.IsAuraToken(token.id, token.parent.id))) {
    // in v10 invisible is now a thing, so hidden is considered "not on scene"
    Logger.debug(`hidden, collate auras ${!update.hidden} ${update.hidden}`);
    addToCollateSemaphore(canvas.scene.id, !update.hidden, update.hidden, "updateToken, hidden");
  } else if (AAHelpers.IsAuraToken(token.id, token.parent.id) && AAHelpers.EntityHPCheck(token)) {
    Logger.debug("0hp, collate auras true true");
    addToCollateSemaphore(canvas.scene.id, false, true, "updateToken, dead");
  }
}

export function updateItemHook(item, update, _flags, _id) {
  // console.warn("updateItemHook", { item, _flags, _id });
  if (foundry.utils.isNewerVersion(game.version ?? "", "13")) {
    if (item.actor?.inCompendium) return;
  } else {
    if (item.actor?.compendium) return;
  }

  // Logger.debug("updateItemHookArgs", { item, update, _flags, _id });
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  // check if item has active Effect with ActiveAura
  if (!item.effects.map((i) => i.flags?.ActiveAuras?.isAura).includes(true)) {
    return;
  }

  // isSuppressed Checks for dnd5e
  // dnd5e makes an effect isSuppressed when equipped or attunement status changes

  if (foundry.utils.hasProperty(update, "system.equipped")) {
    Logger.debug("equipped, collate auras true true");
    addToCollateSemaphore(canvas.scene.id, true, true, "updateItem, equipped");
  } else if (foundry.utils.hasProperty(update, "system.attunement")) {
    Logger.debug("attunement, collate auras true true");
    addToCollateSemaphore(canvas.scene.id, true, true, "updateItem, attunement");
  }
}

export async function deleteItemHook(item, _flags, _id) {
  // console.warn("deleteItemHook", { item, _flags, _id });
  if (foundry.utils.isNewerVersion(game.version ?? "", "13")) {
    if (item.actor?.inCompendium) return;
  } else {
    if (item.actor?.compendium) return;
  }
  if (CONFIG.ActiveEffect.legacyTransferral) return;
  const sceneEffect = CONFIG.AA.Map.get(canvas.scene._id)?.effects.find((e) => AAHelpers.originsMatch(e.data.origin, item.uuid));
  if (sceneEffect) {
    const effectMap = ActiveAuras.UpdateAllTokens(new Map(), canvas.tokens.placeables, sceneEffect.entityId);

    for (const update of effectMap.values()) {
      if (AAHelpers.originsMatch(update.effect.origin, item.uuid)) {
        await ActiveAuras.RemoveActiveEffects(update.token.id, update.effect.origin);
      }
    }

    AAHelpers.ExtractAuraById(sceneEffect.entityId, canvas.scene._id);
  }

  addToCollateSemaphore(canvas.scene.id, true, true, "deleteItem");
}


export function updateActiveEffectHook(effect, _update) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  if (effect.flags?.ActiveAuras?.isAura) {
    Logger.debug("updateAE, collate auras true true");
    addToCollateSemaphore(canvas.scene.id, true, true, "updateActiveEffect");
    // After the per-scene CollateAuras reconciles the current scene's tokens,
    // also reconcile applied effects on actors whose canvas instance lives on
    // OTHER scenes the activeGM has visited. Without this, toggling an aura
    // off while viewing a different scene than where it was applied leaves
    // the applied effect(s) lingering on actor-linked records of the originating
    // scene -- visible to e.g. an assistant GM still watching that scene.
    // Unguarded by CONFIG.AA.Map.size: the helper is a no-op when there are no
    // stale effects (sub-millisecond predicate iteration over game.actors), and
    // running it unconditionally catches a small but real edge case where a
    // freshly-dragged token brings pre-existing applied effects whose origin
    // doesn't match anything live this session.
    CONFIG.AA.Semaphore.add(AAHelpers.RemoveStaleAurasGlobally);
  }
}

/**
 * On removal of active effect from linked actor, if aura remove from canvas.tokens
 */
export function deleteActiveEffectHook(effect, options) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  const applyStatus = effect.flags?.ActiveAuras?.applied;
  const auraStatus = effect.flags?.ActiveAuras?.isAura;
  const timeUpExpiry = options["expiry-reason"]?.startsWith("times-up:");

  if (!applyStatus && auraStatus && !timeUpExpiry) {
    Logger.debug("deleteActiveEffect, collate auras true false", { effect, options });
    addToCollateSemaphore(canvas.scene.id, false, true, "deleteActiveEffect");
  } else if (auraStatus) {
    const sceneEffect = CONFIG.AA.Map.get(canvas.scene._id)?.effects.find((e) => e.data._id === effect.id);
    if (sceneEffect) AAHelpers.ExtractAuraById(sceneEffect.entityId, canvas.scene._id);
  }
}

/**
 * On creation of active effect on linked actor, run MainAura
 */
export function createActiveEffectHook(effect) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  if (!effect.flags?.ActiveAuras?.applied && effect.flags?.ActiveAuras?.isAura) {
    Logger.debug("createActiveEffect, collate auras true false", { effect });
    addToCollateSemaphore(canvas.scene.id, true, false, "createActiveEffect");
  }
}


export async function canvasReadyHook(canvas) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  Logger.debug("canvasReady, collate auras true false");
  // AAMeasure reads PIXI Token.center/x/y for distance checks. Immediately
  // after canvasReady fires, Token.center can still be inconsistent with the
  // document data (it derives from PIXI position/width which haven't flushed).
  // The visible symptom is that 1x1 tokens (which use only center.x/y) fail
  // their polygon check while multi-cell tokens (which also use corner-derived
  // points via token.x + g2) pass — yielding wildly inverted distance results.
  //
  // To force consistency, wait for two animation frames so PIXI runs its render
  // loop and Token.center is recomputed from the up-to-date document.
  try {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Also wait for any in-flight named animations (movement, etc.) up to 1s.
    const CA = foundry.canvas?.animation?.CanvasAnimation ?? CanvasAnimation;
    const waits = [];
    for (const t of canvas.tokens?.placeables ?? []) {
      if (t.movementAnimationPromise) waits.push(t.movementAnimationPromise);
      const animationName = t.animationName;
      if (animationName) {
        const anim = CA.getAnimation(animationName);
        if (anim?.promise) waits.push(anim.promise);
      }
    }
    if (waits.length) {
      await Promise.race([
        Promise.all(waits),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    }
  } catch (err) { /* best-effort wait */ }
  // Re-check scene: a rapid scene-switch during the await above could leave
  // canvas.scene null, in which case the collation would no-op anyway.
  //
  // Pass removeAuras=true (not just checkAuras=true). Auras are scene-scoped to
  // wherever the source token currently is, but the effects they apply live on
  // actor-linked actors and therefore survive scene transitions. Without the
  // removal pass on canvasReady, switching into a scene whose effectMap is empty
  // (or doesn't include some prior aura origin) leaves stale ActiveAuras-applied
  // effects on every actor that was previously in range -- e.g. Wabu's Aura of
  // Protection persisting on Aveneus/Sheyla/Kami/Calcryx after the source token
  // moved scenes or its aura was disabled. RemoveAppliedAuras keys cleanup off
  // the current scene's effectMap origins, so it correctly preserves any aura
  // whose source IS on this scene.
  if (canvas.scene) {
    addToCollateSemaphore(canvas.scene.id, true, true, "ready");
    // After per-scene CollateAuras settles, also reconcile cross-scene applied
    // effects emitted by sources on the entering scene. Same semantic as the
    // movementUpdate cleanup: sources on the active scene "claim" their auras,
    // so applications tagged with another scene -- on actors that aren't here
    // -- are stale until that other scene is revisited. Smart preservation in
    // RemoveCrossSceneSourceAuras skips actors with a token on this scene so
    // dual-present actor-linked effects aren't wrongly stripped when MainAura's
    // dedup left them with an old scene tag.
    // Unguarded: when only one scene has been visited so far this session,
    // the helper iterates but finds no cross-scene-tagged effects to remove
    // (sub-millisecond no-op). Running unconditionally also catches stale
    // effects that survived from a prior session and would otherwise need to
    // wait for the next scene transition or the readyHooks orphan sweep.
    CONFIG.AA.Semaphore.add(AAHelpers.RemoveCrossSceneAurasForScene, canvas.scene.id);
  }
}


export function preUpdateActorHook(actor, update, _other) {
  // console.warn("preUpdateActorHook", { actor, update, _other });
  if (foundry.utils.isNewerVersion(game.version ?? "", "13")) {
    if (actor.inCompendium) return;
  } else {
    if (actor.compendium) return;
  }
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  if (AAHelpers.EntityHPCheck(actor) || AAHelpers.EventHPCheck(update)) {
    Logger.debug("Actor dead, checking for tokens and auras", { actor, update });
    const activeTokens = actor.getActiveTokens();
    if (activeTokens.length > 0 && AAHelpers.IsAuraToken(activeTokens[0].id, canvas.id)) {
      Logger.debug("preUpdate0hp, collate auras true true");
      Hooks.once("updateActor", () => {
        addToCollateSemaphore(canvas.scene.id, true, true, "updateActor, dead");
      });
    }
  }
  if ((foundry.utils.hasProperty(update, "system.attributes.hp.value") // 5e system
    && actor.system?.attributes?.hp?.value === 0 && update.system.attributes.hp.value > 0)
   || (foundry.utils.hasProperty(update, "system.wounds.value") // swade
     && (update.system.wounds.value - (actor.system?.wounds?.ignored ?? 0)) < (actor.system?.wounds?.max ?? 0))
   || (foundry.utils.hasProperty(update, "system.characteristics.health.injured") // demonlord
     && actor.system.characteristics.health.value >= actor.system.characteristics.health.max)
  ) {
    Hooks.once("updateActor", () => {
      addToCollateSemaphore(canvas.scene.id, true, false, "updateActor, revived");
    });
  }
}

export function deleteCombatHook(combat) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  if (getAASetting("combatOnly")) {
    AAHelpers.RemoveAllAppliedAuras();
  }
}

export function deleteCombatantHook(combatant) {
  const sceneId = combatant.sceneId ?? combatant.parent.scene?.id;
  if (AAHelpers.IsAuraToken(combatant.tokenId, sceneId)) {
    AAHelpers.ExtractAuraById(combatant.tokenId, sceneId);
  }
}

export function createCombatantHook(combat, combatant) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  if (!combat.active) return;
  combatant = canvas.tokens.get(combatant.tokenId);
  const tokenEffects = Array.from(combatant.actor?.allApplicableEffects() ?? []);
  for (let effect of (tokenEffects ?? [])) {
    if (effect.flags?.ActiveAuras?.isAura) {
      Logger.debug("createToken, collate auras true false");
      addToCollateSemaphore(combat.scene.id, true, false, "add combatant");
      break;
    }
  }
}

export function createWallHook() {
  Logger.debug("createWall, collate auras false true");
  addToCollateSemaphore(canvas.scene.id, false, true, "Wall Created");
}

export function updateWallHook() {
  Logger.debug("updateWall, collate auras true true");
  addToCollateSemaphore(canvas.scene.id, true, true, "Wall Updated");
}

export function deleteWallHook() {
  Logger.debug("updateWall, collate auras true false");
  addToCollateSemaphore(canvas.scene.id, true, false, "Wall Deleted");
}

export function updateMeasuredTemplateHook(data, _update, _options) {
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  if (!foundry.utils.getProperty(data, "flags.ActiveAuras")) return;
  // ActiveAuras.MainAura(undefined, "template movement", data.parent.id);
  addToCollateSemaphore(canvas.scene.id, true, true, "updateMeasuredTemplateHook");
}

export function deleteMeasuredTemplateHook(doc){
  if (canvas.scene === null) {
    Logger.debug("Active Auras disabled due to no canvas");
    return;
  }
  //if (!foundry.utils.getProperty(data, "flags.ActiveAuras")) return;
  AAHelpers.ExtractAuraById(doc.id, doc.parent.id);
  //CollateAuras(scene._id, false, true, "template deletion")
  addToCollateSemaphore(canvas.scene.id, false, true, "deleteMeasuredTemplateHook");
}

export function preCreateActiveEffectHook(effect, _update, options) {
  if (getAASetting("scrollingAura")) {
    if (foundry.utils.getProperty(effect, "flags.ActiveAuras.applied") === true) {
      options.animate = false;
    }
  }
}

export function preDeleteActiveEffectHook(effect, options) {
  if (getAASetting("scrollingAura")) {
    if (foundry.utils.getProperty(effect, "flags.ActiveAuras.applied") === true) {
      options.animate = false;
    }
  }
}
