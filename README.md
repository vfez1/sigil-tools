# Sigil Tools

Internal Foundry VTT module for the Sigil campaign. Requires the **dnd5e** system.

## Submodules

### Roll Model
Overhauls D&D 5e rolls with quality-of-life improvements: quick rolls, multi-roll display, damage buttons, GWM/Celestial Revelation support, an always-visible HP widget, and wildshape effect automation.

### Active Auras
Automatically applies active effects to tokens within a defined aura radius. Integrates with the Roll Model item sheet to configure aura flags per active effect.

### Grid Aware Auras
Adds configurable aura geometry, rendering, and automation that respects grid shape and token movement.

### Override Settings
Applies a fixed set of world/client settings and keybindings on load, driven by `submodules/override-settings/settings.json`.

### Dev Scene Loader
Loads the `Iedcaru` scene when the `Dev` user logs in.

## Dependencies

- [socketlib](https://github.com/manuelVo/foundryvtt-socketlib)
- [lib-wrapper](https://github.com/ruipin/fvtt-lib-wrapper)
