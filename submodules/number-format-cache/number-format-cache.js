import { isEnabled } from "../shared/enable.js";

const SETTING_KEY = "enableNumberFormatCache";
// Distinct formats in use stay in the dozens; the cap only guards against a caller passing
// ever-changing options.
const MAX_CACHED = 5000;

export function registerNumberFormatCacheHooks() {
    // Checked at `setup`, like grid-regions: registerModuleHooks() runs at script load, before the
    // settings exist, when isEnabled() would always report true.
    Hooks.once("setup", () => {
        if (!isEnabled(SETTING_KEY)) return;
        _cacheNumberFormats();
    });
}

/**
 * Reuse `Intl.NumberFormat` objects instead of building a new one for every number formatted.
 *
 * dnd5e's `formatNumber` (weights, prices, ranges, durations, every activity label) constructs a
 * fresh `Intl.NumberFormat` on each call, and building one costs far more than using it: on a
 * sheet with a big spellbook (Aveneus, 166 spells) that was ~40 ms of every recalculation and
 * ~40 ms of every redraw. `formatNumber` is module-local in dnd5e, so it can't be patched itself;
 * the constructor is replaced instead with a proxy that hands back one shared formatter per
 * distinct (locales, options), so every caller, core's and modules' too, benefits.
 *
 * A formatter is immutable once built (format() and resolvedOptions() never change it), so
 * sharing one can't change any output: the same arguments give a formatter that formats exactly
 * the same. Subclassing (`new.target` other than the proxy) and arguments that can't be turned
 * into a key build a fresh formatter as before; static members (`supportedLocalesOf`) and
 * `instanceof Intl.NumberFormat` pass through the proxy unchanged.
 */
function _cacheNumberFormats() {
    const NumberFormat = Intl.NumberFormat;
    const cache = new Map();
    const shared = (args) => {
        let key;
        try { key = JSON.stringify(args); } catch { return new NumberFormat(...args); }
        let formatter = cache.get(key);
        if (!formatter) {
            formatter = new NumberFormat(...args);
            if (cache.size < MAX_CACHED) cache.set(key, formatter);
        }
        return formatter;
    };
    const proxy = new Proxy(NumberFormat, {
        construct: (target, args, newTarget) => (newTarget === proxy ? shared(args) : Reflect.construct(target, args, newTarget)),
        apply: (target, self, args) => shared(args),
    });
    Intl.NumberFormat = proxy;
}
