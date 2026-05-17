const CONFIG_PATH = `/modules/sigil-tools/submodules/suppress-warnings/warnings.json`;
const LOG_PREFIX = "[Sigil Tools | Suppress Warnings]";

const config = loadConfigSync();
const suppressions = (config.warnings ?? []).map(entry => ({
    ...entry,
    regex: entry.pattern ? new RegExp(entry.pattern) : new RegExp(escapeRegExp(entry.message))
}));

// Mutable — expired entries are pruned once game.version is available on init
let activeRegexes = suppressions.map(s => s.regex);

if (activeRegexes.length > 0) {
    const isSuppressed = (msg) => {
        const str = msg instanceof Error ? msg.message : String(msg ?? "");
        return activeRegexes.some(p => p.test(str));
    };

    const _warn = console.warn.bind(console);
    console.warn = function (...args) {
        if (isSuppressed(args[0])) return;
        _warn(...args);
    };

    const _error = console.error.bind(console);
    console.error = function (...args) {
        if (isSuppressed(args[0])) return;
        _error(...args);
    };
}

// Prune expired suppressions and notify once game version is known
Hooks.once("init", () => {
    const currentVersion = game.version;
    activeRegexes = suppressions
        .filter(s => {
            if (!foundry.utils.isNewerVersion(s.until, currentVersion)) {
                console.warn(`${LOG_PREFIX} Suppression for "${s.message}" expired (until: ${s.until}, current: ${currentVersion}). Remove it from warnings.json.`);
                return false;
            }
            return true;
        })
        .map(s => s.regex);
});

function loadConfigSync() {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", CONFIG_PATH, false);
        xhr.send();
        if (xhr.status === 200) return JSON.parse(xhr.responseText);
    } catch (e) {
        console.error(`${LOG_PREFIX} Failed to load warnings.json:`, e);
    }
    return { warnings: [] };
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
