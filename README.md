# Sigil Tools

Internal Foundry VTT module for the Sigil campaign. Requires the **dnd5e** system.

## Submodules

### Roll Model
Overhauls D&D 5e rolls with quality-of-life improvements: quick rolls, multi-roll display, damage buttons, GWM/Celestial Revelation/Hand of Harm/Blood Fury Tattoo support, an always-visible HP widget, and wildshape effect automation.
Full documentation: [submodules/roll-model/README.md](submodules/roll-model/README.md).

### Always HP
The persistent, draggable HP widget referenced above: quick damage/heal buttons, temp-HP and death-save tracking for the selected token(s), and a full-heal/knock-to-zero shortcut.

### Active Auras
Automatically applies active effects to tokens within a defined aura radius. Integrates with the Roll Model item sheet to configure aura flags per active effect.

### Visual Auras
Adds an "Auras" tab to token config sheets for defining visual aura rings drawn directly on a token, independent of the Active Auras effect-application logic. The rings are drawn by Foundry's designated GM (highest role first), so turning an aura on or off only shows while the Gamemaster is in Foundry; Garuk, the inventory website's Assistant GM, runs no module code and draws nothing.

### Grid Regions
Forces Foundry's Region shapes — both from dnd5e template placement (e.g. an activity's area of effect) and the manual region-drawing tools — to measure using the scene's own grid metric instead of true euclidean geometry, so a burst radius matches the grid squares the table actually plays on.

### Item Drag Move
Makes dragging an item from one actor's sheet onto another's move it instead of copying it, and makes every move happen exactly once. dnd5e used to leave some moves on both sheets: it decides copy or move while the item hovers and sometimes loses that decision by the drop, and it deletes the original without waiting, so moving the same item again quickly could copy it. Now the decision is made again at the drop, the original is gone before the drop finishes, and a drag of an item that's still being moved is refused with a notice. Dragging from a compendium or the Items sidebar still copies, and so does dragging from a sheet you don't own (a move would need to delete the original there). This world has no copy key: Override Settings unbinds dnd5e's Drag Copy and Drag Move keys (Ctrl and Shift roll with disadvantage and advantage here), so between sheets you own a drag is always a move. There's no setting for it; `ENABLED` in `item-drag-move.js` switches it (off leaves dnd5e's own behavior: copy between sheets, Shift to move).

### Number Format Cache
Makes updating a character faster by reusing number formatters. dnd5e builds a new one from scratch for every number it shows (each weight, price, range and spell label), which on a big spellbook such as Aveneus's (166 spells) is about 40 ms of every recalculation and as much again of every sheet redraw. The browser's `Intl.NumberFormat` is replaced, from `setup` on, with one that hands back the same formatter for the same settings, so numbers look exactly as before. *Enable: Number Format Cache* among the submodule toggles turns it off (after a reload).

### Cast Spell Cache
Makes spells granted by an item added from the inventory website show on the character's spell page. dnd5e lists an item's spells (its Cast activities) through a hidden copy of each spell on the actor, made in the browser of whoever adds the item; the website adds items as Garuk, which has no browser and runs no dnd5e code, so those spells stayed off the spell page until cast from the item once. Now the Gamemaster's browser makes the missing copies when Garuk adds or changes such an item, and when the Gamemaster logs in it fills in any that are missing on any actor except the party stash (from items added while the Gamemaster wasn't on, or actors imported whole). Only the Gamemaster user does this, never an Assistant GM (Foundry would otherwise hand the job to Garuk, an Assistant GM that runs no code, whenever the Gamemaster is offline). Whenever it adds any, the Gamemaster gets a popup listing each actor, spell and the item it comes from. There's no setting for it; `ENABLED` in `cast-spell-cache.js` switches it.

### Effect Macro
Adds macro triggers to active effects and related dnd5e workflows.

### Effect Autocomplete
Adds an attribute-path autocomplete dropdown to the Active Effect Changes tab, built by walking the actual dnd5e actor/item/token schema so suggested paths are always valid for the current system version.

### Character Features
Per-character automation config, keyed by actor name: toggles specific active effects on/off automatically when a character wild-shapes/reverts, or when a tracked item's attunement changes. Each change is handled once, by the tab of the person who made it (the Gamemaster's, for attunement changed on the inventory website), which posts one chat card listing what it toggled.

### Ascendant Focus
For an Ascendant Dragon-Touched Focus (Fizban's): while a character wears an item with a utility activity named "Ascendant" that has a use left (equipped, and attuned if required), the cast dialog of a level 1–8 spell gets an *Ascendant: Cast at level 9* checkbox under the spell slot. Ticked, the spell is cast at level 9 while the slot picked is still the one spent, and the item's Ascendant use is spent. dnd5e's `_prepareUsageScaling` is wrapped on every activity type to set the level; loaded from `roll-model.js`.

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

### Remote Roll
Lets the inventory website (`cityofdoors.net`, through its Foundry user Garuk) ask a player's open Foundry tab to roll a skill check from their character's sheet: dnd5e's own roll, so every bonus and effect on the character (Guidance, items, features) counts and the usual chat card appears. Used by *Avi's Spells* for the Intelligence (Arcana) check when copying a spell from a scroll, rolled by Aveneus's player. The website checks that player is logged in first; with nobody to roll, it refuses rather than rolling for them.

### Codex Add
*Add to Codex as NPC* (Sigil world actors only) and *Add to Codex as monster* (any NPC-type actor, in the world or a compendium) in an actor sheet's ⋮ menu and in the right-click menus of the Actors sidebar and every Actor compendium, for GMs. Each opens the Sigil Codex (`cityofdoors.net/codex`) in a browser tab named `sigil-codex`, which makes the page from that actor and fills it in the way its *Import from Foundry* does, or opens the page that already has it. The Codex does the work with the browser's own login, so the actor's UUID is all that leaves Foundry. A third entry, *Find art in Art Finder*, on every actor (world or compendium), opens the Art Finder's *Manage Art* tab (`cityofdoors.net/codex/art-finder/`, in a tab named `sigil-art-finder`) on that actor: a search of Foundry's pictures by name, starting on the actor's, where the picture picked becomes the actor's portrait, its token's, or both. Garuk writes it, so the open sheet updates at once. The same entry is on scenes, in the right-click menus of the Scenes sidebar, Scene compendiums and the navigation bar and in the scene config's header menu, for GMs: the picture picked becomes the scene's background.

## Internal utilities

### Shared
Not a feature of its own — common code the other submodules build on (the module's settings registry and settings-panel UI, the `isEnabled()` per-submodule toggle check, and shared constants like the module name).

## Dependencies

- [socketlib](https://github.com/manuelVo/foundryvtt-socketlib)
- [lib-wrapper](https://github.com/ruipin/fvtt-lib-wrapper)
