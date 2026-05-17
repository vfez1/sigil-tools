const CONFIG_PATH = `/modules/sigil-tools/submodules/suppress-warnings/warnings.json`;
const LOG_PREFIX = "[Sigil Tools | Suppress Warnings]";

Hooks.once("init", async () => {
    let config;
    try {
        const response = await fetch(CONFIG_PATH);
        config = await response.json();
    } catch (e) {
        console.error(`${LOG_PREFIX} Failed to load warnings.json:`, e);
        return;
    }

    const currentVersion = game.version;
    const active = [];
    const expired = [];

    for (const entry of (config.warnings ?? [])) {
        if (foundry.utils.isNewerVersion(entry.until, currentVersion)) {
            active.push(entry);
        } else {
            expired.push(entry);
        }
    }

    for (const entry of expired) {
        console.warn(`${LOG_PREFIX} Suppression for "${entry.message}" expired (until: ${entry.until}, current: ${currentVersion}). Remove it from warnings.json.`);
    }

    if (active.length === 0) return;

    const patterns = active.map(entry =>
        entry.pattern ? new RegExp(entry.pattern) : new RegExp(escapeRegExp(entry.message))
    );

    const isSuppressed = (msg) => patterns.some(p => p.test(String(msg ?? "")));

    const _warn = console.warn.bind(console);
    console.warn = function (...args) {
        if (isSuppressed(args[0])) return;
        _warn(...args);
    };

    if (typeof foundry?.utils?.logCompatibilityWarning === "function") {
        const _compat = foundry.utils.logCompatibilityWarning.bind(foundry.utils);
        foundry.utils.logCompatibilityWarning = function (message, options) {
            if (isSuppressed(message)) return;
            _compat(message, options);
        };
    }
});

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
