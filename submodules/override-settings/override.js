Hooks.once("ready", async () => {
    const MODULE_ID = "sigil-tools";
    const log = (...args) => console.log(`[${MODULE_ID}]`, ...args);
    const warn = (...args) => console.warn(`[${MODULE_ID}]⚠️`, ...args);
    const error = (...args) => console.error(`[${MODULE_ID}]❌`, ...args);
    // v14 renamed objectsEqual → equals; use whichever the host runtime provides.
    const _equals = foundry.utils.equals ?? foundry.utils.objectsEqual;

    const enabledSetting = game.settings.get(MODULE_ID, "enableOverrideSettings");
    if (!enabledSetting) return;

    log("Hook: ready");

    try {
        const response = await fetch(`/modules/${MODULE_ID}/submodules/override-settings/settings.json`);

        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);

        const config = await response.json();
        log("✅ Loaded config:", config);

        /* -------------------------------------------- */
        /*  KEYBINDINGS                                 */
        /* -------------------------------------------- */

        if (config.keybindings) {
            log("Overriding keybindings...");

            const makeBinding = (entry) => {
                if (typeof entry === "string")
                    return { key: entry, modifiers: [], repeat: false };
                return {
                    key: entry.key,
                    modifiers: entry.modifiers ?? [],
                    repeat: entry.repeat ?? false,
                };
            };

            const overrideEditable = (key, newKeys) => {
                const action = game.keybindings.actions.get(key);
                if (!action) return warn(`No keybinding found for ${key}`);

                log(`Overriding '${key}' with:`, newKeys);

                const formatted = newKeys.map(makeBinding);
                action.editable = formatted;
                const bindings = [...(action.uneditable ?? []), ...formatted];
                game.keybindings.bindings.set(key, bindings);
            };

            for (const [key, keys] of Object.entries(config.keybindings)) {
                overrideEditable(key, keys);
            }

            const stored = JSON.parse(
                localStorage.getItem("core.keybindings") ?? "{}",
            );

            for (const key of Object.keys(config.keybindings)) {
                const binding = game.keybindings.bindings.get(key);
                if (binding) {
                    stored[key] = binding;
                    log(`Saved keybinding '${key}'`);
                } else {
                    warn(`Could not find binding for '${key}'`);
                }
            }

            localStorage.setItem("core.keybindings", JSON.stringify(stored));
            log("Keybindings override complete.");
        }

        /* -------------------------------------------- */
        /*  SETTINGS (CLIENT + WORLD SAFE)              */
        /* -------------------------------------------- */

        for (const [namespace, settings] of Object.entries(config)) {
            if (["keybindings", "uiConfig"].includes(namespace)) continue;

            log(`Applying settings for '${namespace}'...`);

            for (const [key, value] of Object.entries(settings)) {
                const fullKey = `${namespace}.${key}`;
                const setting = game.settings.settings.get(fullKey);

                if (!setting) {
                    warn(`Setting not found: ${fullKey}`);
                    continue;
                }

                if (setting.scope === "world" && !game.user.isGM) {
                    log(`Skipping GM-only setting: ${fullKey}`);
                    continue;
                }

                const current = game.settings.get(namespace, key);

                if (_equals(current, value)) continue;

                try {
                    await game.settings.set(namespace, key, value);
                    log(`Set ${fullKey}`);
                } catch (err) {
                    warn(`Failed to set ${fullKey}`, err);
                }
            }
        }

        /* -------------------------------------------- */
        /*  UI CONFIG                                   */
        /* -------------------------------------------- */

        if (config.uiConfig) {
            const setting = game.settings.settings.get("core.uiConfig");

            if (!setting) {
                warn("core.uiConfig not found");
            } else if (setting.scope === "world" && !game.user.isGM) {
                log("Skipping GM-only core.uiConfig");
            } else {
                const current = game.settings.get("core", "uiConfig");
                const uiConfig = foundry.utils.deepClone(current);

                uiConfig.fade.opacity = config.uiConfig.fadeOpacity;
                uiConfig.chatNotifications = config.uiConfig.chatNotifications;

                if (!_equals(uiConfig, current)) {
                    await game.settings.set("core", "uiConfig", uiConfig);
                    log("✅ UI config override complete.");
                }
            }
        }
        log("✅ All settings successfully overridden!");
    } catch (err) {
        error("Error while loading settings:", err);
    }
});
