import CONSTANTS from "./constants.mjs";
import { getAASetting, settings } from "./settings.mjs";
import { AAHelpers } from "./lib/AAHelpers.mjs";
import { AAMeasure } from "./lib/AAMeasure.mjs";
import { CollateAuras } from "./lib/CollateAuras.mjs";
import {
  canvasReadyHook,
  createActiveEffectHook,
  createCombatantHook,
  createTokenHook,
  createWallHook,
  deleteActiveEffectHook,
  deleteCombatHook,
  deleteCombatantHook,
  deleteItemHook,
  deleteMeasuredTemplateHook,
  deleteTokenHook,
  deleteWallHook,
  preCreateActiveEffectHook,
  preDeleteActiveEffectHook,
  preDeleteTokenHook,
  preUpdateActorHook,
  updateActiveEffectHook,
  updateCombatHook,
  updateItemHook,
  updateMeasuredTemplateHook,
  updateTokenHook,
  updateWallHook,
} from "./lib/AAHooks.mjs";
import { ActiveAuras } from "./lib/ActiveAuras.mjs";
import { extendAESheet } from "./app/ActiveAuraSheet.mjs";



export function initHooks() {
  settings();

  libWrapper.ignore_conflicts(
    CONSTANTS.MODULE_ID,
    ["dae"],
    [
      "CONFIG.ActiveEffect.documentClass.prototype.isTemporary",
      "CONFIG.ActiveEffect.documentClass.prototype.apply",
    ],
  );

  libWrapper.register(
    CONSTANTS.MODULE_ID,
    "CONFIG.ActiveEffect.documentClass.prototype.apply",
    AAHelpers.applyWrapper,
    "WRAPPER"
  );


  libWrapper.register(
    CONSTANTS.MODULE_ID,
    "ActiveEffect.prototype._displayScrollingStatus",
    AAHelpers.scrollingText,
    "MIXED"
  );
  libWrapper.register(
    CONSTANTS.MODULE_ID,
    "CONFIG.ActiveEffect.documentClass.prototype.isTemporary",
    AAHelpers.showEffectIcon,
    "WRAPPER"
  );


  if (getAASetting("debug")) CONFIG.debug.AA = true;

  extendAESheet();

}

function configureApi() {
  const API = {
    AAHelpers,
    AAMeasure,
    ActiveAuras,
  };
  game.modules.get(CONSTANTS.MODULE_ID).api = API;
}

function gmHooks() {
  Hooks.on("createToken", createTokenHook);
  Hooks.on("updateToken", updateTokenHook); // On token movement run MainAura
  Hooks.on("deleteToken", deleteTokenHook);
  Hooks.on("preDeleteToken", preDeleteTokenHook);
  Hooks.on("preUpdateActor", preUpdateActorHook);
  Hooks.on("updateItem", updateItemHook); // On item Change for example equipped state change
  Hooks.on("deleteItem", deleteItemHook);
  Hooks.on("updateActiveEffect", updateActiveEffectHook);
  Hooks.on("deleteActiveEffect", deleteActiveEffectHook); // if aura remove from canvas.tokens
  Hooks.on("createActiveEffect", createActiveEffectHook); // On creation of active effect on linked actor, run MainAura
  Hooks.on("canvasReady", canvasReadyHook);
  Hooks.on("updateCombat", updateCombatHook);
  Hooks.on("deleteCombat", deleteCombatHook);
  Hooks.on("deleteCombatant", deleteCombatantHook);
  Hooks.on("createCombatant", createCombatantHook);

  // pre update hooks for scrolling text
  Hooks.on("preCreateActiveEffect", preCreateActiveEffectHook);
  // Hooks.on("preUpdateActiveEffect", preUpdateActiveEffectHook);
  Hooks.on("preDeleteActiveEffect", preDeleteActiveEffectHook);

  // dnd5e wildshape support: actor identity flips under linked tokens during
  // transformInto / revertOriginalForm. Force a full recollation so the map
  // tracks the live actor and stale-origin effects get swept by RemoveAppliedAuras.
  // We trigger off `updateToken` rather than the dnd5e hooks because the dnd5e
  // hooks fire only on the user that called transformInto/revertOriginalForm.
  // When a non-GM player initiates the transform, the dnd5e hooks fire on the
  // player but we need CollateAuras to run on the GM (where CONFIG.AA.GM is
  // true). The `updateToken` hook fires on every client via Foundry's database
  // sync, so this listener catches both GM- and player-initiated transforms.
  if (game.system.id === "dnd5e") {
    // Poll until the source token's PIXI center matches the value derived from
    // its current document (x, y, width, height). After a size-changing
    // wildshape (e.g. 1x1 -> Huge 3x3) PIXI can take several render frames to
    // catch up — especially when a new texture has to load — and a fixed rAF
    // wait sometimes proceeds while Token.center is still based on the old
    // shape. That stale center makes MainAura compute the aura polygon as if
    // the source were still 1x1, leaving the affected-token set unchanged.
    const waitForTokenStable = async (tokenDoc, maxFrames = 30) => {
      if (!tokenDoc) return;
      const grid = canvas.dimensions?.size ?? 100;
      for (let i = 0; i < maxFrames; i++) {
        const obj = tokenDoc.object;
        if (obj?.center) {
          const ex = tokenDoc.x + (tokenDoc.width * grid) / 2;
          const ey = tokenDoc.y + (tokenDoc.height * grid) / 2;
          if (Math.abs(obj.center.x - ex) < 0.5 && Math.abs(obj.center.y - ey) < 0.5) return;
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    };

    Hooks.on("updateToken", async (tokenDoc, change) => {
      if (!("actorId" in change)) return;
      try {
        await waitForTokenStable(tokenDoc);
        const obj = tokenDoc?.object;
        if (obj?.movementAnimationPromise) await obj.movementAnimationPromise;
        const animationName = obj?.animationName;
        if (animationName) {
          const CA = foundry.canvas?.animation?.CanvasAnimation ?? CanvasAnimation;
          await CA.getAnimation(animationName)?.promise;
        }
      } catch (err) { /* best-effort wait */ }
      if (canvas.scene) {
        CONFIG.AA.Semaphore.add(CollateAuras, canvas.scene.id, true, true, "actorId change");
      }
    });
  }
}

function allUserHooks() {
  Hooks.on("createWall", createWallHook);
  Hooks.on("updateWall", updateWallHook);
  Hooks.on("deleteWall", deleteWallHook);
  Hooks.on("updateMeasuredTemplate", updateMeasuredTemplateHook);
  Hooks.on("deleteMeasuredTemplate", deleteMeasuredTemplateHook);
}

async function setAAGM() {
  // Pick the canonical "primary GM" with deterministic ordering, so every
  // connected client computes the same answer. Foundry's `game.users.activeGM`
  // getter (v13+) returns the active user with the lowest id; if it isn't
  // available we replicate that contract with an explicit sort. Using
  // `game.users.find(...)` here was the source of a long-standing bug: two
  // GMs connecting in different orders could each end up seeing themselves
  // as the first active GM, leaving both with `CONFIG.AA.GM === true` and
  // running MainAura/CreateActiveEffect in parallel -- producing duplicate
  // aura effects (most visibly on the aura caster, where the source-effect
  // dedup short-circuit also failed).
  const activeGM = game.users.activeGM
    ?? game.users.filter((u) => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id))[0];
  CONFIG.AA.GM = game.user.isGM && activeGM?.id === game.user.id;
}

export async function readyHooks() {
  if (!game.modules.get("lib-wrapper")?.active && game.user.isGM)
    ui.notifications.error("Roll Model Active Auras integration requires the 'libWrapper' module. Please install and activate it.");

  configureApi();

  await setAAGM();

  // Re-evaluate the primary AAGM whenever a user connects or disconnects so a
  // GM joining mid-session can't leave two clients both believing they hold
  // the AAGM role. Without this, the first GM to connect keeps CONFIG.AA.GM
  // true forever, and any later-joining GM that sorts earlier than them in
  // the user collection independently also computes CONFIG.AA.GM true.
  Hooks.on("userConnected", () => setAAGM());

  CONFIG.AA.Semaphore = new foundry.utils.Semaphore(1);

  // Sweep applied-aura effects in two ways before the initial CollateAuras
  // runs (which is the moment MainAura would otherwise see stale state and
  // either skip a needed create or treat duplicates as canonical):
  //   1. ORPHAN (this block): effect's origin actor has no token on the
  //      currently-loaded scene (e.g. a deleted polymorph form from a
  //      previous session). originsMatch would otherwise lock CollateAuras
  //      out of recreating the proper origin's effect. Scoped to this scene
  //      because that's where we know the actor set is "current"; running it
  //      on every scene change would wrongly flag cross-scene effects.
  //   2. DEDUP (the AAHelpers.dedupAppliedAuras call below): multiple
  //      applied effects on the same actor share the same normalized
  //      (origin, name). Runtime CreateActiveEffect already enforces
  //      single-instance, so any pre-existing stack is leftover from a prior
  //      race (the pre-Semaphore movement bug, or any future unguarded
  //      path). Runs only here at session start because it's the only
  //      moment guaranteed to be quiescent — no Semaphore-protected
  //      operations are in flight yet (hooks aren't registered until
  //      further below), so there's no risk of racing a concurrent delete.
  // GM-only because both delete embedded documents.
  if (CONFIG.AA.GM && canvas.tokens) {
    const activeActorIds = new Set(
      canvas.tokens.placeables.map((t) => t.actor?.id).filter((id) => id)
    );
    for (const token of canvas.tokens.placeables) {
      const actor = token.actor;
      if (!actor) continue;
      const orphans = [];
      for (const eff of actor.allApplicableEffects()) {
        if (!eff.flags?.ActiveAuras?.applied) continue;
        // Only delete top-level actor effects — allApplicableEffects also
        // surfaces item-transferred effects, which can't be removed via
        // actor.deleteEmbeddedDocuments("ActiveEffect", ...).
        if (eff.parent !== actor) continue;
        // Only meaningful for Actor-sourced auras. Compendium- or world-item-
        // sourced effects (e.g. template casts) have no actor parent and we
        // can't tell if they're stale.
        const sourceActor = fromUuidSync(eff.origin, { strict: false })?.parent;
        if (!(sourceActor instanceof Actor)) continue;
        const sourceActorId = sourceActor.id;
        const isOrphan = !game.actors.get(sourceActorId)
          || !activeActorIds.has(sourceActorId);
        if (isOrphan) orphans.push(eff.id);
      }
      if (orphans.length) {
        try {
          await actor.deleteEmbeddedDocuments("ActiveEffect", orphans);
        } catch (err) {
          console.error("ActiveAuras orphan-sweep delete failed", { actor: actor.name, orphans, err });
        }
      }
    }
    await AAHelpers.dedupAppliedAuras();
  }

  // run initial aura collation before hooks
  await CollateAuras(canvas.id, true, false, "readyHook");

  allUserHooks();

  if (CONFIG.AA.GM) {
    // await canvasReadyHook(game.canvas);
    gmHooks();
  }

  if (CONFIG.AA.GM) canvasReadyHook(game.canvas);
}

export function socketLibReadyHooks() {
  foundry.utils.setProperty(CONFIG, "AA.Socket", null);
  CONFIG.AA.Socket = socketlib.registerModule(CONSTANTS.MODULE_ID);
  CONFIG.AA.Socket.register("userCollate", CollateAuras);
}
