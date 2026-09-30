# Sigil Tools

Internal Foundry VTT module for the Sigil campaign. Requires the **dnd5e** system.

## Submodules

### Roll Model
Overhauls D&D 5e rolls with quality-of-life improvements: quick rolls, multi-roll display, damage buttons, GWM/Celestial Revelation support, an always-visible HP widget, and wildshape effect automation.
Full documentation: [submodules/roll-model/README.md](submodules/roll-model/README.md).

### Always HP
The persistent, draggable HP widget referenced above: quick damage/heal buttons, temp-HP and death-save tracking for the selected token(s), and a full-heal/knock-to-zero shortcut.

### Active Auras
Automatically applies active effects to tokens within a defined aura radius. Integrates with the Roll Model item sheet to configure aura flags per active effect.

### Visual Auras
Adds an "Auras" tab to token config sheets for defining visual aura rings drawn directly on a token, independent of the Active Auras effect-application logic.

### Grid Regions
Forces Foundry's Region shapes — both from dnd5e template placement (e.g. an activity's area of effect) and the manual region-drawing tools — to measure using the scene's own grid metric instead of true euclidean geometry, so a burst radius matches the grid squares the table actually plays on.

### Item Drag Move
Dragging an item from one actor's sheet onto another's moves it instead of copying it. Dragging from a compendium or the Items sidebar still copies, holding Ctrl or Alt while dragging still copies, and dragging from a sheet you don't own still copies (a move would need to delete the original there). Always on; there's no setting for it.

### Effect Macro
Adds macro triggers to active effects and related dnd5e workflows.

### Effect Autocomplete
Adds an attribute-path autocomplete dropdown to the Active Effect Changes tab, built by walking the actual dnd5e actor/item/token schema so suggested paths are always valid for the current system version.

### Character Features
Per-character automation config, keyed by actor name: toggles specific active effects on/off automatically when a character wild-shapes/reverts, or when a tracked item's attunement changes.

### Chat Archive
Once the chat log passes a configured message count, automatically POSTs the oldest messages to an external archive server and deletes them from the live log, keeping the in-game chat log short. The GM also gets an archive button (box icon, next to Clear Chat) that sends every message currently in chat to the archive after a confirmation; messages are only removed once the server confirms it stored them.

### Override Settings
Applies a fixed set of world/client settings and keybindings on load, driven by `submodules/override-settings/settings.json`.

### Suppress Warnings
Filters known/expected console warnings and errors matching patterns defined in `submodules/suppress-warnings/warnings.json`. Each suppression carries an expiry version, after which it logs a reminder to remove it instead of continuing to hide the message.

### Dev Scene Loader
Loads the `Iedcaru` scene when the `Dev` user logs in.

### Carousel Combat Tracker
Carousel-style combat tracker replacing Foundry's default combat tracker UI — a maintained fork of theripper93's `combat-tracker-dock`, with campaign-specific tweaks (reversed wheel-scroll direction, faster scroll speed).
Full documentation: [submodules/combat-tracker-dock/README.md](submodules/combat-tracker-dock/README.md).

## Internal utilities

### Shared
Not a feature of its own — common code the other submodules build on (the module's settings registry and settings-panel UI, the `isEnabled()` per-submodule toggle check, and shared constants like the module name).

## Dependencies

- [socketlib](https://github.com/manuelVo/foundryvtt-socketlib)
- [lib-wrapper](https://github.com/ruipin/fvtt-lib-wrapper)
