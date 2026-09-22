import { MODULE_NAME } from "../shared/const.js";
import { isEnabled } from "../shared/enable.js";

const SETTING_KEY = "enableGridRegions";

const TARGET_PLACE_REGION = "CONFIG.Canvas.layers.regions.layerClass.prototype.placeRegion";
const TARGET_DRAG_SHAPE = "CONFIG.Canvas.layers.regions.layerClass.prototype._createDragShapeData";

export function registerGridRegionsHooks() {
    // The enable check has to happen inside the hook, not here: registerModuleHooks() runs at
    // script load, before registerAllSettings() has run at `init`, so isEnabled() would hit its
    // "settings not registered yet" fallback and always report true. By `setup` the setting is
    // real, which is also when we want to wrap anyway.
    Hooks.once("setup", () => {
        if (!isEnabled(SETTING_KEY)) return;
        _applyGridBasedRegionShapes();
    });
}

/**
 * Force a region shape to be measured with the scene grid's own metric.
 *
 * Core builds every parametric shape twice over: `gridBased: false` (the schema default)
 * routes through `gridlessGrid` and produces true euclidean geometry, while `true` routes
 * through the scene grid and honours the **Grid Diagonals** game setting. With Equidistant
 * diagonals, `SquareGrid#getCircle` returns four corner points — so a 20 ft burst becomes
 * the 8x8 square block 5e actually plays on, instead of a circle.
 *
 * Shapes with no `gridBased` field (polygon, token, grid) are already grid-conforming or
 * explicitly pointed, so they are left untouched.
 * @param {object} shape  Raw shape data, mutated in place.
 * @returns {object}      The same shape, for convenient chaining.
 */
function _gridify(shape) {
    const cls = foundry.data?.BaseShapeData?.TYPES?.[shape?.type];
    if (cls?.schema?.fields?.gridBased) shape.gridBased = true;
    return shape;
}

/**
 * Make every region this client creates measure on the grid.
 *
 * Two entry points exist and they never overlap, so neither wrapper can double-apply:
 *
 * 1. `placeRegion` — the programmatic placement API. dnd5e's `TemplatePlacement.fromActivity`
 *    reaches it via `placeRegions`, which just loops and delegates, so wrapping the singular
 *    covers both plus any macro that places a region itself. It matters that this runs before
 *    the original: `placeRegion` builds the *preview* document straight from the data handed
 *    to it, so stamping here is what makes Fireball preview as a square rather than snapping
 *    to one on release. The flag then rides into the created Region on its own, because
 *    dnd5e's `preConfirm` serialises the preview document back out with `toObject()`.
 *
 * 2. `_createDragShapeData` — the interactive draw tools (the Regions layer shape buttons).
 *    Its return value is fed directly to the shape constructor, and `_updateDragPreview`
 *    pushes that shape onto the preview document, so this likewise covers preview and result.
 *
 * Wrapped at `setup` rather than `init` so any module that swaps the region layer class during
 * `init` has already done so, and via libWrapper so a conflict is reported rather than one of
 * us silently losing the patch — same reasoning as the movement-history override in roll-model.
 *
 * Not covered, deliberately: `visual-auras` builds its aura rings with `createEmbeddedDocuments`
 * and already sets `gridBased` per preset, so it bypasses both paths and needs nothing here.
 * Region *appearance* defaults (Visibility, Highlight Mode) are not our business either — core's
 * own Region Palette stores those per user.
 */
function _applyGridBasedRegionShapes() {
    libWrapper.register(MODULE_NAME, TARGET_PLACE_REGION, function (wrapped, data, options) {
        // Copy rather than mutate: this is the caller's own object, not ours to edit. Clone via
        // the house `.toObject?.() ?? deepClone(...)` guard rather than a spread, because a
        // caller is free to hand us live BaseShapeData instances instead of raw data, and
        // spreading a DataModel yields a half-initialised object. See AAHelpers.applyTemplate.
        if (data?.shapes?.length) {
            data = {
                ...data,
                shapes: data.shapes.map(s => _gridify(s?.toObject?.() ?? foundry.utils.deepClone(s))),
            };
        }
        return wrapped(data, options);
    }, "WRAPPER");

    libWrapper.register(MODULE_NAME, TARGET_DRAG_SHAPE, function (wrapped, event) {
        // Safe to mutate — core hands back a fresh deepClone of the tool's shape data.
        return _gridify(wrapped(event));
    }, "WRAPPER");
}
