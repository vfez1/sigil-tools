import CONSTANTS from "../constants.mjs";
import { aaLocalize } from "../labels.mjs";
import { getAASetting } from "../settings.mjs";
import Logger from "./Logger.mjs";

export class AAHelpers {

  /**
   * Strip the "Actor.<id>." prefix from an origin UUID so that wildshape-created
   * polymorph actors compare equal to the original actor for the same item.
   */
  static stripActorFromOrigin(origin) {
    if (typeof origin !== "string") return origin;
    return origin.replace(/^Actor\.[a-zA-Z0-9]+\./, "");
  }

  /**
   * Returns true if two origin UUIDs refer to the same underlying item, ignoring
   * the actor wrapper. Used so a polymorph's aura is recognized as equivalent
   * to its source actor's aura.
   *
   * Two falsy origins ARE NOT a match — "no origin" is meaningless as an
   * identity, so we treat such effects as unrelated.
   */
  static originsMatch(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    return AAHelpers.stripActorFromOrigin(a) === AAHelpers.stripActorFromOrigin(b);
  }

  static evaluateCustomCheck(token, check, auraEntity) {
    try {
      // console.warn("custom check", { token, check, auraEntity });
      // these are exposed here so they can by used in the custom check/eval
      // eslint-disable-next-line no-unused-vars
      const actor = token.actor;
      // eslint-disable-next-line no-unused-vars
      const system = token.actor?.system;
      // eslint-disable-next-line no-unused-vars
      const rollData = token.actor?.getRollData();
      // console.warn("custom check", { token, check, actor, system, rollData });
      const result = Boolean(eval(check));
      return result;
    } catch (e) {
      Logger.warn(`Custom check failed: ${check}`, { e, token, check, auraEntity });
    }
    return false;
  }

  static drawSquare(point) {
    const { x, y } = point;
    const g = new PIXI.Graphics();
    g.beginFill(0xff0000, 0.2).drawRect(x - 5, y - 5, 10, 10);
    const aura = canvas.layers.find((l) => l.name === "DrawingsLayer").addChild(g);
    aura.squares = true;
  }

  /**
   *
   * @param {*} token
   * @param {*} sceneID
   * @returns
   */
  static IsAuraToken(tokenID, sceneID) {
    const MapObject = CONFIG.AA.Map.get(sceneID);
    if (!MapObject?.effects) return false;
    for (const effect of MapObject.effects) {
      if (effect.entityId === tokenID) return true;
    }
    return false;
  }

  static getActorFromAAEffectData(effectData) {
    const originActor = fromUuidSync(effectData.data.origin)?.parent;
    if (originActor) return originActor;

    const parts = (effectData.origin ?? effectData.data.origin).split(".");
    // eslint-disable-next-line no-unused-vars
    const [entityName, entityId, embeddedName, embeddedId] = parts;
    const actor = game.actors.get(entityId);
    return actor;
  }

  static DispositionCheck(auraTargets, auraDis, tokenDis) {
    switch (auraTargets) {
      case "Allies": {
        if (auraDis !== tokenDis) return false;
        else return true;
      }
      case "Enemy": {
        if (auraDis === tokenDis) return false;
        else return true;
      }
      case "All":
        return true;
    }
  }

  static CheckType(canvasToken, type) {
    switch (game.system.id) {
      case "dnd5e":
      case "sw5e":
        return AAHelpers.typeCheck5e(canvasToken, type);
      case "swade":
        return AAHelpers.typeCheckSWADE(canvasToken, type);
      case "dnd4e":
        return AAHelpers.typeCheck4e(canvasToken, type);
      case "demonlord":
        return AAHelpers.typeCheckDemonLord(canvasToken, type);
    }
  }

  static CheckTypes(canvasToken, types) {
    if (!types || types === "") return true;
    const typesArray = Array.isArray(types)
      ? types
      : types?.toLowerCase().replaceAll(",", ";").split(";").map((t) => t.trim()) ?? [];

    let match = false;
    for (const type of typesArray) {
      if (AAHelpers.CheckType(canvasToken, type)) {
        match = true;
        break;
      }
    }
    return match;
  }

  static typeCheck5e(canvasToken, type) {
    if (type?.trim() === "any") return true;
    const systemData = canvasToken?.actor?.system;
    let tokenTypes;
    switch (canvasToken.actor.type) {
      case "npc":
        {
          try {
            tokenTypes = Array.from(new Set([
              systemData?.details.type.value,
              systemData?.details.type.subtype,
              systemData?.details.type.custom,
            ])).filter((t) => t);
          } catch (error) {
            Logger.error("ActiveAuras: the token has an unreadable type", canvasToken);
          }
        }
        break;
      case "character":
        {
          try {
            if (game.system.id === "sw5e") {
              tokenTypes = [systemData?.details.species.toLowerCase()];
            } else{
              tokenTypes = Array.from(new Set([
                (systemData?.details?.race?.name ?? systemData?.details?.race)?.toLocaleLowerCase(),
                (systemData?.details?.race?.name ?? systemData?.details?.race)?.toLocaleLowerCase().replace("-", " ").split(" "),
                systemData?.details.type?.value?.toLocaleLowerCase(),
                systemData?.details.type?.subtype?.toLocaleLowerCase(),
                systemData?.details.type?.custom?.toLocaleLowerCase(),
              ].flat())).filter((t) => t);
            }
          } catch (error) {
            Logger.error("ActiveAuras: the token has an unreadable type", canvasToken);
          }
        }
        break;
      case "group":
      case "vehicle":
        return;
    }

    if (tokenTypes.includes(type)) return true;

    // remaining humanoid checks only npcs in 5e or all in sw5e
    if (type.trim() !== "humanoid") return false;
    if (canvasToken.actor.type !== "character" && game.system.id === "dnd5e") return false;
    const humanoidRaces = game.system.id === "sw5e"
      ? CONSTANTS.SW5E_HUMANOID_RACES
      : CONSTANTS.HUMANOID_RACES;

    let match = false;
    for (const x of tokenTypes) {
      if (humanoidRaces.includes(x)) {
        match = true;
        break;
      }
    }
    return match;
  }

  static typeCheckSWADE(canvasToken, type) {
    let tokenType;
    switch (canvasToken.actor.type) {
      case "npc":
        {
          try {
            tokenType = canvasToken.actor?.system.details.species.name.toLowerCase();
          } catch (error) {
            Logger.error("ActiveAuras: the token has an unreadable type", canvasToken);
          }
        }
        break;
      case "character":
        {
          try {
            tokenType = canvasToken.actor?.system.details.species.name.toLowerCase();
          } catch (error) {
            Logger.error("ActiveAuras: the token has an unreadable type", canvasToken);
          }
        }
        break;
      case "vehicle":
        return;
    }
    return tokenType === type;
  }

  static typeCheck4e(canvasToken, type) {
    let tokenType;
    switch (canvasToken.actor.type) {
      case "NPC":
        {
          try {
            tokenType = [
              canvasToken.actor?.system.details.type,
              canvasToken.actor?.system.details.other,
              canvasToken.actor?.system.details.origin,
            ];
          } catch (error) {
            Logger.error("ActiveAuras: the token has an unreadable type", canvasToken);
          }
        }
        break;
      case "Player Character":
        {
          try {
            tokenType = ["humanoid"]; //Will update this later after adding detailed info to PCs
          } catch (error) {
            Logger.error("ActiveAuras: the token has an unreadable type", canvasToken);
          }
        }
        break;
      case "group":
      case "vehicle":
        return;
    }
    if (tokenType.includes(type)) return true;
    return false;
  }

  static typeCheckDemonLord(canvasToken, type) {
    if (type?.trim() === "any") return true;
    const actorData = canvasToken?.actor;
    let tokenTypes;
    switch (canvasToken.actor.type) {
      case "character":
        {
          try {
            tokenTypes = [actorData?.items.find((i) => i.type === "ancestry")?.name?.toLocaleLowerCase()]
          } catch (error) {
            Logger.error("ActiveAuras: the token has an unreadable type", canvasToken);
          }
        }
        break;
      case "creature":
        {
          try {
            if (actorData.system.descriptor.toLocaleLowerCase().includes('('))
            {
              let descriptor = actorData.system.descriptor.toLocaleLowerCase()
              descriptor = descriptor.replace(")", "")
              tokenTypes = descriptor.replace("(", "").split(" ")
            }
            else
            tokenTypes = [actorData.system.descriptor.toLocaleLowerCase()]
          } catch (error) {
            Logger.error("ActiveAuras: the token has an unreadable type", canvasToken);
          }
        }
        break;
      case "vehicle":
        return;
    }
    if (tokenTypes.includes(type)) return true;
    return false;
  }

  static Wildcard(canvasToken, wildcard, extra) {
    if (game.system.id !== "swade") return true;
    let Wild = canvasToken.actor.isWildcard;
    if (Wild && wildcard) return true;
    else if (!Wild && extra) return true;
    else return false;
  }

  static HPCheck(document) {
    switch (game.system.id) {
      case "dnd5e":
      case "sw5e": {
        if (foundry.utils.getProperty(document, "system.attributes.hp.max") === 0) return true; // dead
        if (foundry.utils.getProperty(document, "system.attributes.hp.value") > 0) return false;
        //alive!
        else return true; // dead
      }
      case "swade": {
        const { max, value, ignored } = document.system.wounds;
        if (value === 0) return false; // no wounds taken
        if ((value - ignored) >= max) return true;
        // dead
        else return false;
      }
      case "demonlord": {
        const { max, value } = document.system.characteristics.health
        if ((value) >= max) return true;
        // dead
        else return false;
      }
    }
  }

  static EntityHPCheck(entity) {
    const actor = (entity.collectionName === "actors")
      ? entity
      : entity.actor;
    return AAHelpers.HPCheck(actor);
  }

  static EventHPCheck(event) {
    // if this is not a hp/wound check then assume not dead
    if (!foundry.utils.hasProperty(event, "system.wounds") && !foundry.utils.getProperty(event, "system.attributes.hp")) {
      return false;
    }
    return AAHelpers.HPCheck(event);
  }

  static GetRollData({ actor, item, deterministic = false } = {}) {
    if (!actor) return null;
    const actorRollData = actor.getRollData({ deterministic });
    const rollData = {
      ...actorRollData,
      item: item ? item.toObject().system : undefined,
    };

    // Include an ability score modifier if one exists
    const abl = item?.abilityMod;
    if (abl && "abilities" in rollData) {
      const ability = rollData.abilities[abl];
      if (!ability) {
        Logger.warn(`Item ${actor.name} in Actor ${actor.name} has an invalid item ability modifier of ${abl} defined`);
      }
      rollData.mod = ability?.mod ?? 0;
    }
    return rollData;
  }

  static EvaluateRollString({ rollString, token, item, deterministic = false } = {}) {
    if (Number.isInteger(Number.parseInt(`${rollString}`.trim()))) return rollString;

    const actor = token.actor ?? token.parent;

    const rollData = AAHelpers.GetRollData({ actor, item, deterministic });
    return Roll.replaceFormulaData(rollString, rollData);
  }

  static ExtractAuraById(entityId, sceneID) {
    if (!CONFIG.AA.GM) return;
    const MapObject = CONFIG.AA.Map.get(sceneID);
    const effectArray = MapObject.effects.filter((e) => e.entityId !== entityId);
    CONFIG.AA.Map.set(sceneID, { effects: effectArray });
    Logger.debug("ExtractAuraById", { AuraMap: CONFIG.AA.Map });
    // AAHelpers.RemoveAppliedAuras();
  }

  /**
   * Collapse multiple AA-applied effects on the same actor that share a
   * normalized (origin, name) — keeping the first-seen and deleting the rest.
   * Matches AAHelpers.originsMatch / CreateActiveEffect dedup semantics:
   * stripActorFromOrigin normalizes Actor.<id>.Item.<id> wrappers so a
   * wildshape copy groups with the original.
   *
   * Runtime CreateActiveEffect already enforces single-instance, so any stack
   * encountered here is leftover from a prior race (the pre-Semaphore
   * movement bug or any future unguarded mutation path).
   *
   * Called from readyHooks at session start, before AA hooks register, so
   * there's no concurrent Semaphore-protected operation to race with the
   * deletes. Do not invoke from a mid-session hook without first wrapping it
   * through CONFIG.AA.Semaphore.add — see prior analysis for the failure
   * mode (transient delete-vs-delete collisions logging spurious errors).
   *
   * GM-only because it deletes embedded documents.
   */
  static async dedupAppliedAuras() {
    if (!CONFIG.AA.GM || !canvas.tokens) return;
    for (const token of canvas.tokens.placeables) {
      const actor = token.actor;
      if (!actor) continue;
      const duplicates = [];
      const seen = new Map();
      for (const eff of actor.allApplicableEffects()) {
        if (!eff.flags?.ActiveAuras?.applied) continue;
        // allApplicableEffects also surfaces item-transferred effects, which
        // can't be removed via actor.deleteEmbeddedDocuments("ActiveEffect").
        if (eff.parent !== actor) continue;
        const key = `${AAHelpers.stripActorFromOrigin(eff.origin)}|${eff.name}`;
        if (seen.has(key)) duplicates.push(eff.id);
        else seen.set(key, eff.id);
      }
      if (duplicates.length) {
        try {
          await actor.deleteEmbeddedDocuments("ActiveEffect", duplicates);
        } catch (err) {
          console.error("ActiveAuras dedup delete failed", { actor: actor.name, duplicates, err });
        }
      }
    }
  }

  static async RemoveAppliedAuras() {
    const MapObject = CONFIG.AA.Map.get(canvas.scene.id);
    if (!MapObject) return;
    const EffectsArray = MapObject.effects.map((i) => i.data.origin);

    Logger.debug("RemoveAppliedAuras", { MapKey: canvas.scene.id, MapObject, EffectsArray });

    for (let removeToken of canvas.tokens.placeables) {
      const tokenEffects = Array.from(removeToken?.actor?.allApplicableEffects() ?? []);
      if (tokenEffects.length > 0) {
        for (let testEffect of tokenEffects) {
          if (testEffect?.flags?.ActiveAuras?.applied !== true) continue;
          // Scene-aware filter: only consider for removal effects that were
          // applied in THIS scene. Effects tagged with a different scene
          // belong to a cross-scene actor-linked aura (e.g. Wabu's aura applied
          // in Shadowfell, visible on Hades-side actor-linked Sheyla) and must
          // not be stripped just because the activeGM is now viewing a scene
          // without the source token. Global cleanup runs separately via
          // RemoveStaleAurasGlobally when the aura state actually changes.
          // Legacy effects (no appliedSceneId tag) default to current-scene
          // semantics so they still get cleaned up after upgrade.
          const tag = testEffect.flags.ActiveAuras.appliedSceneId;
          if (tag && tag !== canvas.scene.id) continue;
          if (EffectsArray.some((o) => AAHelpers.originsMatch(o, testEffect.origin))) continue;
          try {
            Logger.debug("RemoveAppliedAuras", { removeToken, testEffect });
            await removeToken.actor.deleteEmbeddedDocuments("ActiveEffect", [testEffect._id]);
          } catch (err) {
            Logger.error("ERROR CAUGHT in RemoveAppliedAuras", err);
          } finally {
            Logger.info(
              aaLocalize("ACTIVEAURAS.RemoveLog", {
                effectDataName: testEffect.name,
                tokenName: removeToken.name,
              })
            );
          }
        }
      }
    }
  }

  /**
   * Remove "stale" applied aura effects across ALL known scenes. An effect is
   * stale when its `origin` no longer corresponds to a live aura in any tracked
   * scene's effectMap. This is the cross-scene counterpart to RemoveAppliedAuras
   * and is used when the aura state itself changes (e.g. the source effect is
   * disabled while the activeGM is viewing a different scene than where the
   * aura had previously been applied). Without this, scene-tagged applied
   * effects would persist on actors forever once the activeGM moves away from
   * the scene that originally applied them.
   *
   * Cheap: O(actors * effects-per-actor), bounded by `game.actors` size.
   * Safe to call unconditionally -- when `CONFIG.AA.Map.size === 1` the
   * iteration runs but finds nothing to remove (sub-millisecond no-op).
   */
  static async RemoveStaleAurasGlobally() {
    if (!CONFIG.AA.GM) return;

    // Union of all live aura origins across every scene the activeGM has visited
    // this session. An applied effect whose origin isn't in this set means its
    // source aura has been disabled, deleted, or moved out of range everywhere.
    const liveOrigins = new Set();
    for (const [, sceneMap] of CONFIG.AA.Map) {
      for (const e of sceneMap.effects ?? []) {
        if (e.data?.origin) liveOrigins.add(e.data.origin);
      }
    }
    const liveOriginsArr = [...liveOrigins];

    Logger.debug("RemoveStaleAurasGlobally", { liveOrigins: liveOriginsArr });

    // Iterate base actors (covers actor-linked tokens regardless of which scene
    // their canvas instance is on). Unlinked-token actors aren't iterated here
    // because they're scene-bound and reconciled by the regular per-scene
    // cleanup whenever the activeGM views their scene.
    for (const actor of game.actors) {
      const stale = [];
      for (const eff of actor.effects ?? []) {
        if (eff.flags?.ActiveAuras?.applied !== true) continue;
        const matched = liveOriginsArr.some((o) => AAHelpers.originsMatch(o, eff.origin));
        if (!matched) stale.push(eff.id);
      }
      if (stale.length) {
        try {
          Logger.debug("RemoveStaleAurasGlobally deleting", { actor: actor.name, stale });
          await actor.deleteEmbeddedDocuments("ActiveEffect", stale);
        } catch (err) {
          Logger.error("ERROR CAUGHT in RemoveStaleAurasGlobally", err);
        }
      }
    }
  }

  /**
   * Cross-scene reconciliation for an aura SOURCE on a specific scene. Used in
   * two contexts:
   *
   * 1) On source token movement: when Wabu moves on his current scene, any
   *    applied effects emitted by this token's auras that live on OTHER scenes'
   *    actor records are conceptually stale (Foundry treats the actor-linked
   *    Wabu tokens as independent placeables, but for "one source, one logical
   *    aura" semantics the user expects a move to invalidate the aura
   *    everywhere).
   *
   * 2) On scene activation: when activeGM enters a scene, the source tokens
   *    on that scene effectively "claim" their auras' current state. Applied
   *    effects from those auras that are tagged with a different scene are
   *    stale across the broader campaign and won't be reconciled by MainAura
   *    (which only operates on the active scene's tokens).
   *
   * To avoid stripping legitimately-live effects, this helper SKIPS any actor
   * that has a token on the trigger scene. Those actors are covered by the
   * per-scene MainAura/RemoveAppliedAuras flow which uses live PIXI distance
   * checks; removing here would risk wiping a dual-present actor-linked
   * effect that MainAura's dedup just no-op'd through. Only actors with no
   * token on the trigger scene are at risk of holding stale cross-scene
   * effects with no other reconciliation path, so those are the only ones
   * cleaned up here.
   *
   * Re-application is lazy: when activeGM next views the orphaned actor's
   * scene, canvasReady runs MainAura there and reapplies if appropriate.
   *
   * @param {string} sourceTokenId - id of the aura-source token on the trigger scene
   * @param {string} sceneId       - id of the trigger scene
   */
  static async RemoveCrossSceneSourceAuras(sourceTokenId, sceneId) {
    if (!CONFIG.AA.GM) return;
    const sceneMap = CONFIG.AA.Map.get(sceneId);
    if (!sceneMap?.effects?.length) return;

    // The set of aura origins this token emits on its scene. A single token can
    // emit multiple auras (e.g. Aura of Protection plus Aura of Courage), so
    // we collect them all.
    const sourceOrigins = sceneMap.effects
      .filter((e) => e.entityId === sourceTokenId)
      .map((e) => e.data?.origin)
      .filter((o) => !!o);
    if (!sourceOrigins.length) return;

    // Build the set of actor ids that have a token on the trigger scene. We
    // skip these actors because per-scene MainAura/RemoveAppliedAuras already
    // owns their reconciliation -- touching them here would risk stripping a
    // dual-present actor-linked effect whose tag happens to be from a prior
    // scene visit but is still in range of the current scene's source token.
    //
    // IMPORTANT: read tokens from the Scene document (`game.scenes.get(sceneId).tokens`),
    // NOT from `canvas.tokens.placeables`. This helper runs asynchronously
    // through the Semaphore, so `canvas.scene` may have changed between
    // scheduling and execution (e.g. activeGM switched scenes during the
    // ~2s a movement-triggered MainAura takes). The Scene document's token
    // collection is always available in memory regardless of which scene is
    // currently rendered on the canvas, so it gives the correct trigger-scene
    // membership unconditionally.
    const presentActorIds = new Set();
    const triggerScene = game.scenes.get(sceneId);
    for (const tokenDoc of triggerScene?.tokens ?? []) {
      if (tokenDoc.actor?.id) presentActorIds.add(tokenDoc.actor.id);
    }

    Logger.debug("RemoveCrossSceneSourceAuras", {
      sourceTokenId, sceneId, sourceOrigins, presentActorCount: presentActorIds.size,
    });

    for (const actor of game.actors) {
      if (presentActorIds.has(actor.id)) continue;
      const stale = [];
      for (const eff of actor.effects ?? []) {
        if (eff.flags?.ActiveAuras?.applied !== true) continue;
        const tag = eff.flags.ActiveAuras.appliedSceneId;
        // Skip trigger-scene effects -- MainAura will reconcile them with live
        // distance checks. Skip untagged legacy effects too (they default to
        // trigger-scene semantics).
        if (!tag || tag === sceneId) continue;
        // Only consider effects originating from one of this token's auras.
        if (!sourceOrigins.some((o) => AAHelpers.originsMatch(o, eff.origin))) continue;
        stale.push(eff.id);
      }
      if (stale.length) {
        try {
          Logger.debug("RemoveCrossSceneSourceAuras deleting", { actor: actor.name, stale });
          await actor.deleteEmbeddedDocuments("ActiveEffect", stale);
        } catch (err) {
          Logger.error("ERROR CAUGHT in RemoveCrossSceneSourceAuras", err);
        }
      }
    }
  }

  /**
   * Fan-out helper for scene activation: run RemoveCrossSceneSourceAuras for
   * every unique aura source token on the given scene. Used by canvasReady so
   * that entering a scene reconciles all of its sources' cross-scene
   * applications in one semaphore step (rather than queuing N tasks at the
   * call site, which couples the call site to effectMap shape).
   *
   * Expects to run AFTER the scene's CollateAuras has populated the effectMap.
   *
   * @param {string} sceneId - id of the scene whose sources should sweep
   */
  static async RemoveCrossSceneAurasForScene(sceneId) {
    if (!CONFIG.AA.GM) return;
    const sceneMap = CONFIG.AA.Map.get(sceneId);
    if (!sceneMap?.effects?.length) return;
    const sourceTokenIds = new Set(
      sceneMap.effects.map((e) => e.entityId).filter((id) => !!id)
    );
    Logger.debug("RemoveCrossSceneAurasForScene", {
      sceneId, sourceTokenIds: [...sourceTokenIds],
    });
    for (const tokenId of sourceTokenIds) {
      await AAHelpers.RemoveCrossSceneSourceAuras(tokenId, sceneId);
    }
  }

  /**
   * Reconcile a freshly-created token's actor against applied AA effects it
   * brought from elsewhere. Used by createTokenHook when an actor is dragged
   * onto a scene from its sheet -- Foundry's data model lets the actor's
   * pre-existing applied auras "follow" the new token even when no source
   * for those auras is present on the destination scene, producing the
   * visible "Sheyla still has Wabu's aura on a Wabu-less map" symptom.
   *
   * The rule: for each applied AA effect on the new token's actor, resolve
   * the effect's origin to a source Actor. If that source actor has no
   * token on the destination scene, the effect is unsupported here and is
   * removed. Dual-present sources (e.g. an actor-linked Wabu placed on
   * both scenes) are preserved because the source actor IS present.
   *
   * Re-application is lazy: if the target also has a token elsewhere where
   * the source IS present, canvasReady's MainAura on that other scene will
   * re-apply the effect with a fresh appliedSceneId.
   *
   * Non-actor-origin effects (template/drawing-based auras) are left alone;
   * those have their own update flow keyed on the template/drawing scene.
   *
   * @param {TokenDocument} token - the newly-created token
   */
  static async ReconcileAppliedAurasOnToken(token) {
    if (!CONFIG.AA.GM) return;
    if (!token?.actor) return;
    const sceneId = token.parent?.id;
    if (!sceneId) return;
    const scene = game.scenes.get(sceneId);
    if (!scene) return;

    // Actor ids that have a token on the destination scene.
    const presentActorIds = new Set();
    for (const t of scene.tokens ?? []) {
      if (t.actor?.id) presentActorIds.add(t.actor.id);
    }

    const stale = [];
    for (const eff of token.actor.effects ?? []) {
      if (eff.flags?.ActiveAuras?.applied !== true) continue;
      // Resolve the effect's origin to the source Actor (if any).
      const sourceParent = fromUuidSync(eff.origin, { strict: false })?.parent;
      if (!(sourceParent instanceof Actor)) continue;
      if (presentActorIds.has(sourceParent.id)) continue;
      stale.push(eff.id);
    }

    if (stale.length) {
      try {
        Logger.debug("ReconcileAppliedAurasOnToken deleting", {
          actor: token.actor.name, scene: scene.name, stale,
        });
        await token.actor.deleteEmbeddedDocuments("ActiveEffect", stale);
      } catch (err) {
        Logger.error("ERROR CAUGHT in ReconcileAppliedAurasOnToken", err);
      }
    }
  }

  static async RemoveAllAppliedAuras() {
    for (let removeToken of canvas.tokens.placeables) {
      const tokenEffects = Array.from(removeToken?.actor?.allApplicableEffects() ?? []);
      if (tokenEffects.length > 0) {
        let effects = tokenEffects.reduce((a, v) => {
          if (v?.flags?.ActiveAuras?.applied) return a.concat(v.id);
          else return a;
        }, []);
        try {
          Logger.debug("RemoveAllAppliedAuras", { removeToken, effects });
          await removeToken.actor.deleteEmbeddedDocuments("ActiveEffect", effects);
        } catch (err) {
          Logger.error("ERROR CAUGHT in RemoveAllAppliedAuras", err);
        } finally {
          Logger.info(
            aaLocalize("ACTIVEAURAS.RemoveLog", {
              tokenName: removeToken.name,
            })
          );
        }
      }
    }
  }

  static async UserCollateAuras(sceneID, checkAuras, removeAuras, source) {
    // Compute the active GM into a local; do NOT overwrite CONFIG.AA.GM. The
    // previous code assigned a User object here, which silently corrupted the
    // boolean GM-gate that `CollateAuras` and `MainAura` rely on. Any client
    // that invoked applyDrawing would thereafter pass `if (!CONFIG.AA.GM)`
    // checks unconditionally (a User object is truthy), turning every later
    // hook into a duplicate-aura source.
    const activeGM = game.users.activeGM
      ?? game.users.filter((u) => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!activeGM) return;
    await CONFIG.AA.Socket.executeAsUser("userCollate", activeGM.id, sceneID, checkAuras, removeAuras, source);
  }

  /**
   * Bind a filter to the ActiveEffect.apply() prototype chain
   */

  static applyWrapper(wrapped, ...args) {
    let actor = args[0];
    let change = args[1];
    const AAFlags = foundry.utils.getProperty(change, "effect.flags.ActiveAuras");
    if (!AAFlags) return wrapped(...args);
    if (AAFlags.isAura || AAFlags.ignoreSelf) {
      Logger.info(
        aaLocalize("ACTIVEAURAS.IgnoreSelfLog", {
          effectDataName: change.effect.name,
          changeKey: change.key,
          actorName: actor.name,
        })
      );
      args[1].key = "";
      args[1].value = "";
    }
    return wrapped(...args);
  }

  static scrollingText(wrapped, ...args) {
    // if supressing aura effect notifications and an aura; dont continue
    if (getAASetting("scrollingAura")) {
      if (this.flags["ActiveAuras"]?.applied) {
        return;
      }
    }
    // otherwise continue notificaiton chain
    return wrapped(...args);
  }

  static convertDuration({ units, value } = {}, inCombat, maxSecondsToConvert) {
    let useTurns = inCombat && game.modules.get("times-up")?.active;
    if (units === "second" && value > maxSecondsToConvert) useTurns = false;
    if (!units || (units === "second" && value < CONFIG.time.roundTime)) { // no duration or very short (less than 1 round)
      if (useTurns)
        return { type: "turns", seconds: 0, rounds: 0, turns: 1 };
      else
        return { type: "seconds", seconds: Math.min(1, value ?? 1), rounds: 0, turns: 0 };
    }

    const calendar = game.time.calendar;
    const secondsPerDay = calendar.days.secondsPerMinute * calendar.days.minutesPerHour * calendar.days.hoursPerDay;

    switch (units) {
      case "turn":
      case "turns": return { type: useTurns ? "turns" : "seconds", seconds: 1, rounds: 0, turns: value };
      case "round":
      case "rounds": return { type: useTurns ? "turns" : "seconds", seconds: value * CONFIG.time.roundTime, rounds: value, turns: 0 };
      case "second":
      case "seconds":
        return { type: useTurns ? "turns" : "seconds", seconds: value, rounds: value / CONFIG.time.roundTime, turns: 0 };
      case "minute":
      case "minutes": {
        let durSeconds = value * calendar.days.secondsPerMinute;
        if (durSeconds / CONFIG.time.roundTime <= 10) {
          return { type: useTurns ? "turns" : "seconds", seconds: durSeconds, rounds: durSeconds / CONFIG.time.roundTime, turns: 0 };
        } else {
          return { type: "seconds", seconds: durSeconds, rounds: durSeconds / CONFIG.time.roundTime, turns: 0 };
        }
      }
      case "hour":
      case "hours": return { type: "seconds", seconds: value * calendar.days.secondsPerMinute * calendar.days.minutesPerHour, rounds: 0, turns: 0 };
      case "day":
      case "days": return { type: "seconds", seconds: value * secondsPerDay, rounds: 0, turns: 0 };
      case "week":
      case "weeks": return { type: "seconds", seconds: value * secondsPerDay * calendar.days.values.length, rounds: 0, turns: 0 };
      case "month":
      case "months": {
        const averageMonth = calendar.months.values.reduce((acc, month) => acc + month.days, 0) / calendar.months.values.length;
        return { type: "seconds", seconds: value * secondsPerDay * averageMonth, rounds: 0, turns: 0 };
      }
      case "year":
      case "years": return { type: "seconds", seconds: value * secondsPerDay * calendar.days.daysPerYear, rounds: 0, turns: 0 };
      case "inst":
        return { type: useTurns ? "turns" : "seconds", seconds: 0, rounds: 0, turns: 0 };
      case "spec":
      case "perm":
      case "disp":
      case "distr":
        return { type: useTurns ? "none" : "none", seconds: undefined, rounds: undefined, turns: undefined };
      default:
        Logger.debug("unknown time unit found", units);
        return { type: useTurns ? "none" : "none", seconds: undefined, rounds: undefined, turns: undefined };
    }
  }

  /**
   * Applies effects to a measured template on the canvas, setting duration and relevant flags.
   *
   * @param {Object|Object[]} args - Arguments containing effect, template, and actor data. Can be a single object or an array (first element used).
   * @param {Object} args.duration - Duration information for the effect.
   * @param {Object} args.workflow - Optional midiqol workflow
   * @param {Object} args.itemData - Optional item data, may contain system and duration.
   * @param {string} args.templateId - ID of the measured template on the canvas.
   * @param {string} args.templateUuid - UUID of the measured template (used if not found on canvas).
   * @param {Object} args.actor - Actor data, may contain token and disposition.
   * @param {Object[]} args.effects - Array of effect objects to apply.
   * @param {Object} args.item - Item data, may contain effects and uuid.
   * @param {number} args.spellLevel - Spell level used for casting.
   * @param {string} args.uuid - Optional origin UUID.
   * @returns {Promise<Object>} The modified args object with `haltEffectsApplication` set to true.
   */
  static async applyTemplate(args) {
    let duration;
    const arg = Array.isArray(args) ? args[0] : args;
    const convertedDuration = AAHelpers.convertDuration(
      arg.duration
      ?? arg.workflow?.activity?.duration
      ?? arg.itemData?.system?.duration, true);
    if (convertedDuration?.type === "seconds") {
      duration = {
        seconds: convertedDuration.seconds,
        startTime: game.time.worldTime,
      };
    } else if (convertedDuration?.type === "turns") {
      duration = {
        rounds: convertedDuration.rounds,
        turns: convertedDuration.turns,
        startRound: game.combat?.round,
        startTurn: game.combat?.turn,
      };
    }
    const template = canvas.templates.get(arg.templateId)?.document ?? (await fromUuid(arg.templateUuid));
    const disposition = arg.actor?.token?.disposition ?? arg.actor?.prototypeToken?.disposition ?? 0;
    const effects = arg.effects ?? arg.workflow?.activity?.effects.map((e) => e.effect) ?? arg.item?.effects;
    let templateEffectData = [];

    Logger.debug("applyTemplate", { template, effects, duration, disposition , args });

    for (let effect of effects) {
      // Clone live DataModel docs via `.toObject()` (returns the `_source` shape);
      // for plain JS data the chain short-circuits to `deepClone`. Never use
      // `foundry.utils.duplicate` on a Document or `deepClone` directly on one --
      // SetField fields like `statuses` survive as runtime `Set`s, then JSON-serialize
      // to `{}` when written to flags/DB, silently breaking dnd5e features (e.g. the
      // concentration getter which calls `effect.statuses.has(...)`).
      let data = {
        data: (effect?.toObject?.() ?? foundry.utils.deepClone(effect)),
        parentActorId: false,
        parentActorLink: false,
        entityType: "template",
        entityId: template.id,
        casterDisposition: disposition,
        castLevel: arg.spellLevel,
      };
      if (effect.flags.ActiveAuras?.displayTemp) data.data.duration = duration;
      const origin = arg.item?.uuid
        ?? arg.uuid
        ?? (arg.actor && arg.item ? `Actor.${arg.actor._id}.Item.${arg.item._id}` : undefined);
      data.data.origin = origin;
      templateEffectData.push(data);
    }
    Logger.debug("Applying template effect", templateEffectData);
    await template.update({ [`flags.${CONSTANTS.MODULE_NAME}.IsAura`]: templateEffectData });
    // await AAHelpers.UserCollateAuras(canvas.scene.id, true, false, "templateApply");
    // if midi, this halts effects application for on use macros that call this function
    arg.haltEffectsApplication = true;
    return arg;
  }

  static async applyDrawing(drawing, effects) {
    const templateEffectData = [];
    for (let effect of effects) {
      // See applyTemplate for the rationale behind `.toObject?.() ?? deepClone(...)`.
      const newEffect = {
        data: (effect?.toObject?.() ?? foundry.utils.deepClone(effect)),
        parentActorId: false,
        parentActorLink: false,
        entityType: "drawing",
        entityId: drawing.id,
      };
      newEffect.data.origin = (drawing.document ?? drawing).uuid;
      templateEffectData.push(newEffect);
    }

    Logger.debug("Applying drawing effects", templateEffectData);
    await (drawing.document ?? drawing).update({ [`flags.${CONSTANTS.MODULE_NAME}.IsAura`]: templateEffectData });
    await AAHelpers.UserCollateAuras(canvas.scene.id, true, false, "documentApply");
    return { haltEffectsApplication: true };
  }

  static async removeAurasOnToken(token) {
    if (!token.actorLink) return;
    const auras = Array.from(token.actor.allApplicableEffects())
      .filter((i) => foundry.utils.hasProperty(i, "flags.ActiveAuras.applied")).map((i) => i.id);
    if (!auras) return;
    try {
      Logger.debug("removeAurasOnToken", { token, auras });
      await token.actor.deleteEmbeddedDocuments("ActiveEffect", auras);
    } catch (err) {
      Logger.error("ERROR CAUGHT in removeAurasOnToken", err);
    } finally {
      Logger.info(aaLocalize("ACTIVEAURAS.RemoveLog", { tokenName: token.name }));
    }
  }

  static showEffectIcon(wrapped) {
    const superResult = wrapped();
    if (superResult) return superResult;

    // if not displaying temp, return default
    if (!foundry.utils.getProperty(this, "flags.ActiveAuras.displayTemp")) return superResult;

    // if it is the main aura and ignoring self, return default
    if (foundry.utils.getProperty(this, "flags.ActiveAuras.isAura")
    // && foundry.utils.getProperty(this, "flags.ActiveAuras.ignoreSelf")
    ) {
      return superResult;
    }
    return foundry.utils.getProperty(this, "flags.ActiveAuras.displayTemp");
  }
}
