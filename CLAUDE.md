# sigil-tools — Claude Context

## What this is

A custom all-in-one FoundryVTT module for a private D&D 5e campaign. It is **not a generic community module** — it contains campaign-specific PC automation alongside general-purpose tools.

- **Module ID:** `sigil-tools`
- **Flag/lang namespace:** `rm` (`MODULE_SHORT`)
- **Display title:** Roll Model
- **Server:** `foundry@138.197.228.125:/opt/foundrydata/Data/modules/sigil-tools/`
- **Deploy workflow:** `scp` changed files to the server path above. Use `/deploy` (`.claude/commands/deploy.md`) for this. If `scp` auth fails, fall back to `"C:\Program Files\PuTTY\pscp.exe"` (PuTTY has the saved key).

---

## Submodule map

### roll-model (`submodules/roll-model/`)
The core submodule. Entry point: `roll-model.js` → `HooksUtility.registerModuleHooks()`.

**Roll fast-forward & multi-roll display**
- Keybindings: Shift = advantage, Ctrl/Cmd = disadvantage, Ctrl+Alt = normal (skip dialog)
- Rolls with adv/dis show both dice side-by-side in chat (multi-roll)
- Retroactive upgrade buttons on cards: hover to reroll as adv/dis or upgrade to crit

**Chat card enhancements**
- Attack and damage sections injected into the activity card (consolidates into one card)
- Annotated formulas on attack and damage rolls — each bonus term labelled by source (effect name, "GWM", "prof", etc.)
- Damage type selector pills for multi-type damage (e.g. Lunar Radiance adds radiant alongside slashing); preference persisted per item via flag
- Damage application tray injected for non-GM players (mirrors what the system gives GMs)
- Concentration break button on concentration saves
- GWM toggle: adds proficiency bonus to damage, with checkbox to enable/disable post-roll
- Celestial Revelation toggle for Aasimar characters (adds radiant damage = prof bonus)

**Class/feat automation**
- **Portent** (Divination Wizard): rolls 2–3 d20s on long rest, displays on sheet next to the feat, click to post to chat as a standalone card
- **Elemental Fury / Potent Spellcasting**: injects Wisdom modifier into druid/cleric cantrip damage
- **Lunar Radiance**: injects radiant damage type for wild-shaped druids with Improved Circle Forms
- **GWM**: injects prof bonus into heavy weapon attacks
- **Book of the Dead**: +300 HP on long rest
- **Raven Queen Inspiration**: restores inspiration on long rest

**Acknowledged Mode**
- Tracks damage acknowledgment on chat cards. When a player applies damage, the affected token names are stamped as a green badge visible to all. GM can manually acknowledge. Communicated via socket.

**Always-HP widget** (`submodules/always-hp/`)
- Persistent draggable HP bar for the selected token
- Keybindings: toggle widget, focus HP input
- Position persisted per user via flag

**Misc**
- Prevent token movement history (v14 override via `libWrapper`)
- Turn-start position marker: blue overlay on the cell a token occupied at turn start

---

### active-auras (`submodules/active-auras/`)
Automatically applies active effects to tokens within aura range. Wildshape-aware — handles token identity changes during form transformations.

### character-features (`submodules/character-features/`)
PC-specific automation. Entry point: `character-features.js` (imported from `roll-model.js`).

- **Wild shape effect toggling:** on `createActor` (polymorph) and `dnd5e.revertOriginalForm`, automatically enables/disables named effects on matched actors.
- **Data-driven config** stored in hidden world setting `characterFeaturesConfig` (Object). Edited via "Character Setup" button in module settings (opens `CharacterSetupApp`).
- Each character entry has: `enabled`, `actorName` (matched case-insensitively), and `wildshape[]` — an array of `{ name, disabledWhileShaped, attuned? }` effect rules.
- `attuned` is an optional item-name prefix; if set, the effect only toggles if the original actor has that item attuned.
- Default config (Wabu): Dueling + Natural Armor toggle OFF; Improved Circle Forms + Lunar Transformation toggle ON (Lunar Transformation requires Cloak of the Lunar Guardian attunement).
- To add a new character: add a tab in `CharacterSetupApp.js` + template section in `setup.hbs`, and extend `DEFAULT_CONFIG` in `settings.js`.

### visual-auras (`submodules/visual-auras/`)
Home-grown replacement for the old third-party `grid-aware-auras` module (removed). Renders token auras as native v13/v14 `Region` documents instead of a custom shape-drawing layer. Entry point: `visual-auras.js` (imported from `roll-model.js`), gated by `enableVisualAuras`.

- Preset-based: presets define name/color/radius/effect-linkage, configured via `VisualAuraSetupApp` (world settings menu) and per-actor via `VisualAuraActorConfigApp`.
- Injects an "Auras" tab into token config sheets (placed + prototype) for per-token enable/disable overrides (`flags.sigil-tools.visualAuras.disabled`).
- `createToken`/`deleteToken`/`canvasReady` hooks create, clean up, and reconcile the `Region` documents per scene; reconciliation also re-derives state from live Active Effects so auras don't go stale on scenes that weren't active when an effect toggled.
- Syncs with `ActiveAuras`-linked effects (`flags.ActiveAuras.visualAuraPreset`) so an aura preset auto-enables/disables when its controlling effect is created/deleted/toggled.
- GM-authoritative: most hooks early-return for non-GMs or non-primary GMs (lowest user id among active GMs) to avoid duplicate region writes.

### chat-archive (`submodules/chat-archive/`)
Auto-archives old chat messages to an external server to keep the local chat log from growing unbounded (mitigates the client lag from long-session chat-log DOM accumulation). Entry point: `chat-archive.js` (imported from `roll-model.js`), gated by `enableChatArchive`.

- On every `createChatMessage` (and once at `ready`), trims `game.messages` down to `chatArchiveKeepCount` by POSTing the oldest messages' rendered HTML to `chatArchiveUrl`, then deletes them locally once the server confirms.
- Waits for roll-model's async attack/damage section injection to finish before capturing a message's HTML, so archived cards aren't missing content.
- GM-only; re-entrancy guarded so overlapping `createChatMessage` events don't trigger concurrent archive runs.

### effect-autocomplete (`submodules/effect-autocomplete/`)
Adds an autocomplete/validate dropdown to the Active Effect Config "Changes" key field. Entry point: `effect-autocomplete.js` (imported from `roll-model.js`), gated by `enableEffectAutocomplete`.

- Builds a flat list of valid effect-change key paths once on `ready` by walking the Actor (character) and Item data model schemas (prefixed `system.`), the `TokenDocument` schema (prefixed `token.`), and DND5E activity schemas (bracket-notation, for enchantment effects) — plus a hardcoded list of virtual paths (`DND5E_VIRTUAL`, e.g. `system.save.dc`) and known `flags.dnd5e.*` toggles (`DND5E_FLAGS`) that don't appear in any schema.
- `walkFields` recurses `SchemaField`s and `EmbeddedDataField`s; `MappingField`/`DocumentCollection` fields (e.g. `system.abilities`, `system.skills`) are expanded via a hardcoded key list in `getMappingKeys` since the valid keys aren't derivable from the schema alone. Cycle-safe via a shared `visited` set.
- Hooks `renderActiveEffectConfig`: attaches a filtered dropdown + red-outline invalid-key styling to each key input in the Changes tab.

### combat-tracker-dock (`submodules/combat-tracker-dock/`)
Vendored third-party module ("Carousel Combat Tracker" by theripper93) — a carousel-style combat tracker UI, spiritual successor to Combat Carousel. Loaded unconditionally as its own top-level esmodule in `module.json` (not gated by a sigil-tools enable toggle like the other submodules). Has its own `renderSettingsConfig` hook (`scripts/config.js`) for its settings.

### effectmacro (`submodules/effectmacro/`)
Runs macros from active effects on various triggers (onCreate, onDelete, onEnable, etc.).

### override-settings (`submodules/override-settings/`)
Reads `submodules/override-settings/settings.json` on load and applies world settings, client settings, and keybindings automatically. Useful for enforcing campaign-wide defaults.

### suppress-warnings (`submodules/suppress-warnings/`)
Filters specific console warnings/errors by pattern.

### dev-scene-loader (`submodules/dev-scene-loader/`)
Dev utility for auto-loading a specific scene.

### shared (`submodules/shared/`)
- `const.js` — `MODULE_NAME`, `MODULE_SHORT`, `MODULE_TITLE`, `MODULE_DEBUG_TAG`
- `enable.js` — `isEnabled(settingKey)` safe helper (falls back to `true` if setting not yet registered)

---

## Architecture conventions

- **Enable toggles** for each submodule are registered in `shared/settings.js` (`SETTING_NAMES.ENABLE_*`). The settings UI panel groups these at the bottom under a "Submodules" header via `shared/settings-panel.js`.
- **Settings panel section headers** are injected by `shared/settings-panel.js` in a `renderSettingsConfig` hook. Add new sections there when adding submodule-specific settings.
- **Lang strings** live in `lang/en.json` under the `rm` key (matching `MODULE_SHORT`). Keys follow the pattern `rm.settings.<settingKey>.name` / `.hint`.
- **No build step** — plain ES modules loaded directly, including vendored third-party submodules (`effectmacro`, `combat-tracker-dock`).
- **Flags** on documents use `MODULE_SHORT` (`rm`) as the namespace.
- **libWrapper** is used for patching core Foundry methods (e.g. roll mode patch for v14 compatibility).
- **Socket** (`module.sigil-tools`) is used for player→GM communication (e.g. ACK mode damage stamping).

---

## PC characters (campaign-specific)

- **Wabu** — Moon Druid. Has Wild Shape with Improved Circle Forms and Lunar Transformation (Cloak of the Lunar Guardian, needs attunement). The character-features wildshape toggle was originally written for this character.
- **Sheyla** (Iliad) — Barbarian. Has Relentless Rage, whose save DC is formula-driven (`10 + uses.spent * 5`, resets to 10 on rest) rather than flat — relevant if working on `roll-model`'s embedded-save flow (`chat.js` `_processSaveButtonEvent`).
- Other players use features like Portent, GWM, Potent Spellcasting, Celestial Revelation, Raven Queen Inspiration.

---

## Working conventions

- **Debug logging:** When the user asks you to add logging to trace an issue, do NOT remove that logging once you think you've found the fix. Leave all debug logs in place and deploy the fix. Only remove logging when explicitly told to.

---

## Quick reference

| Task | How |
|---|---|
| Deploy changes | `/deploy` |
| Add a new submodule enable toggle | Add to `SETTING_NAMES` + `registerSettings()` in `shared/settings.js`, add lang strings, add to `toggleKeys` in `shared/settings-panel.js` |
| Add a settings section header | Edit the `renderSettingsConfig` hook in `shared/settings-panel.js` |
| Add a new character-features hook | Add to `registerHooks()` in `character-features/utils/hooks.js` |
