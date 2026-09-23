# Roll Model

Roll Model is the part of Sigil Tools that changes how rolling works in D&D 5e. It rolls things
the moment you click them, merges an item's attack, save and damage into **one chat card**, shows
where every +1 on a roll came from, and lets you fix a roll after the fact (advantage you forgot,
a crit, and so on). It also carries some campaign-specific automation for our characters and a
few table conveniences such as the HP widget.

It is turned on with **Module Settings → Submodules → Enable: Roll Model** (reload required).
Turning it off disables everything on this page.

> Written against dnd5e 6.0 on Foundry v14. A lot of this works by reshaping dnd5e's own chat
> cards, so a dnd5e update is the most likely thing to break it. See
> [Things that are fragile](#things-that-are-fragile).

---

## Contents

1. [Rolling](#1-rolling)
2. [The combined item card](#2-the-combined-item-card)
3. [Roll breakdowns](#3-roll-breakdowns)
4. [Changing a roll afterwards](#4-changing-a-roll-afterwards)
5. [Saving throws](#5-saving-throws)
6. [Checks, saves and initiative on their own cards](#6-checks-saves-and-initiative-on-their-own-cards)
7. [Initiative](#7-initiative)
8. [Applying damage and tracking who took it](#8-applying-damage-and-tracking-who-took-it)
9. [Character and feat automation](#9-character-and-feat-automation)
10. [Table and canvas extras](#10-table-and-canvas-extras)
11. [Settings](#11-settings)
12. [How it works (for maintainers)](#12-how-it-works-for-maintainers)

---

## 1. Rolling

By default, **clicking something rolls it immediately**, with no roll dialog. This applies to
items and spells, ability checks, skills, tools, saving throws and initiative.

| Hold while clicking | Result |
|---|---|
| nothing | Normal roll, no dialog |
| **Shift** | Roll with advantage, no dialog |
| **Ctrl** (Cmd on Mac) | Roll with disadvantage, no dialog |
| **Ctrl + Alt** | Open dnd5e's usual roll dialog instead |
| **V** | Roll a weapon's **versatile** (two-handed) damage |

The Shift / Ctrl / Ctrl+Alt keys are dnd5e's own "skip dialog" keybindings. The Override Settings
submodule forces them to these values for everyone, so nobody has to set them up. **V** is Roll
Model's own keybinding and can be changed in Configure Controls.

**When you still get a dialog:** a spell that uses a spell slot, anything that can be scaled or
upcast, and "order" activities always open the usage dialog, because you have to pick the level or
amount. As soon as you confirm, the rest rolls automatically.

---

## 2. The combined item card

Normally dnd5e posts an item's description card and then a separate card for the attack and
another for the damage. Roll Model **folds all of that into the item's own card**:

1. You use the item. Its card is posted but kept **hidden** while Roll Model works on it.
2. Roll Model rolls the attack, damage and any "other formula" on the item, and stores the results
   on that same card.
3. The card appears with everything in it, top to bottom:

| Row | What it shows |
|---|---|
| **Attack** | The attack roll. With advantage or disadvantage, the discarded d20 is shown dimmed beside the kept one. If ammunition was used, its name appears under the heading. Hit/miss against the target follows dnd5e's *Attack Roll Visibility* setting. |
| **Save** | For save-based items, a full-width button such as *"DC 15 Dexterity Saving Throw"*. Targets press it to roll (see [Saving throws](#5-saving-throws)). |
| **Damage / Healing** | The total, with *"Critical Hit!"* when it is one. Adds a *"(Versatile)"* suffix when rolled versatile. |
| **Damage-type pills** | Only when a damage part could be more than one type (e.g. *Shillelagh*: bludgeoning or force). Click to choose. Roll Model **remembers your choice for that item** and uses it for your future rolls of that item. |
| **GWM / CR checkboxes** | Great Weapon Master and Celestial Revelation toggles, when they apply (see [automation](#9-character-and-feat-automation)). |
| **Formula** | The item's "other formula" roll, if it has one. |
| **Results** | One row per target that rolled the save (see [Saving throws](#5-saving-throws)). |
| **Apply Effect / Apply Damage trays** | dnd5e's trays. The damage tray is added here even though dnd5e 6.0 normally only puts it on its own separate damage card. The buttons are relabelled *"Apply Effect"*, *"Apply Damage"* or *"Apply Healing"*. |

Some other tidying on these cards:

- **Item description is collapsed** by default. It stays open when the item (or activity) has its
  own *chat description* filled in, or when the item is on the exceptions list in **Collapse
  Settings** (see [Settings](#11-settings)).
- **The item's property tags** (spell school, components, range…) are hidden behind an
  *"expand tags"* link. Attack items also get tags like *"Melee Attack · Melee Weapon ·
  Two-Handed"*, which dnd5e normally shows only on the separate attack card.
- **Damage and healing links in descriptions**, such as a weapon mastery's `[[/damage 7]]` or
  `[[/healing 30 type=temphp]]`, get the same Damage/Healing row styling on their own small card.
- **Chat stays scrolled to the bottom** if you were already at the bottom, even when a card grows
  after it appears. If you had scrolled up and applied damage, the chat log keeps your place while
  the card updates.

The damage tray always applies damage to **the tokens you have selected**. dnd5e's
"targeted/selected" switch is forced to "selected" and hidden, because this table never uses
targets.

---

## 3. Roll breakdowns

Click any roll box (attack, damage, save result, check) to open its **breakdown**. It lists:

- the dice, with both d20s shown when there was advantage or disadvantage (crits green, fumbles
  red, the discarded die dimmed);
- **one line per bonus, named after where it came from**: *Ability modifier*, *Proficiency*,
  *Rage*, *Great Weapon Master*, a named active effect such as *Bless*, a magic weapon's
  enchantment, and so on;
- the total. When a roll has several damage types, each type also gets a subtotal with its
  dnd5e icon.

Roll Model works out the names by matching each number in the roll against the actor's and item's
active effects and bonuses. When two bonuses have the same value it can occasionally put the names
the wrong way round. When it can't match a bonus at all, it labels it just *"Bonus"*.

---

## 4. Changing a roll afterwards

For when someone forgot advantage, or the DM rules it was a crit after all. The buttons sit to the
right of the roll box.

| Where | Buttons | What they do |
|---|---|---|
| Attack row | **⌄⌄** disadvantage, **⌃⌃** advantage | Rolls the extra d20 and re-evaluates. Clicking the lit button again returns to the original single roll. Switching directly between advantage and disadvantage works too. |
| Damage row | **CRIT**, **MAX** | CRIT turns the damage into critical damage. **The dice you already rolled are kept** and only the extra crit dice are new. MAX sets every damage die to its maximum. The two can be combined. Turning one off restores the original roll, and turning CRIT on again re-uses the same crit dice rather than rolling new ones. |
| Save result rows, check/save/initiative cards | **⌄⌄**, **⌃⌃** | Same as the attack row. |

Switching a button **on** asks for confirmation first. Switching it **off** doesn't.

**Who sees the buttons:** the GM, whoever posted the card, and the owner of the character that
rolled. Players can change damage on cards they don't technically own: the change is sent to the
GM's client, which saves it.

Flat damage with no dice, such as `[[/damage 7]]`, shows CRIT and MAX greyed out because there is
nothing to double.

---

## 5. Saving throws

### The Save button

On a save-based item's card, targets **select their token(s) and press the Save button**. dnd5e
6.0 rolls one save per selected token and lists them under **Results** on the card.

- **No double rolls.** If some of the selected tokens have already rolled this save, one dialog
  says who's being skipped and asks whether to roll for the rest. Anyone who has already rolled is
  never rolled again. To change an existing save, use that row's advantage/disadvantage buttons.
- **The button shows your result.** With one token selected that has already saved, the button
  turns green (passed) or red (failed). With several selected that have all saved, it turns grey.

### The Results rows

Each target's row shows, in aligned columns:

- the token's name (full name on hover when it is cut short);
- **⌄⌄ / ⌃⌃** buttons to re-roll that save with disadvantage or advantage (for the GM and that
  token's owner);
- the save result. Click anywhere on the row to see its breakdown;
- **the damage that was actually applied to that token**, once someone applies damage, coloured
  by how it compares to the card's total (see [section 8](#8-applying-damage-and-tracking-who-took-it));
- dnd5e's Legendary Resistance button, when the target has uses left and failed.

### Half damage on a successful save

For spells like *Fireball*, tokens that **succeeded** automatically take half damage (or none, if
the spell says so) when damage is applied from this card, just as on dnd5e's own damage card. If
you click a multiplier in the tray yourself, your choice wins.

---

## 6. Checks, saves and initiative on their own cards

Ability checks, skills, tools, saving throws rolled from the sheet, and initiative keep **dnd5e's
normal compact card**. Roll Model adds to it:

- a dimmed badge for the discarded d20 when rolled with advantage or disadvantage;
- the itemised **breakdown** when you click the roll;
- for owners, **⌄⌄ / ⌃⌃** buttons on the card, right of the roll box. The card's
  *"(Advantage)"* text updates to match. On an initiative card, the tracker moves too, along with
  the rest of the creature's group. If the save came from an item's Save button, that item card's
  Results row updates too.

**Concentration saves:** when a concentration save fails, dnd5e's small "break concentration"
icon becomes a full-width **Break Concentration** button. Once concentration is broken, the button
stays on the card, greyed out. On a success nothing extra is shown.

---

## 7. Initiative

- **Quick roll.** Rolling initiative from the tracker or the sheet goes straight to chat like any
  other check, with the breakdown and reroll buttons above.
- **Rolling again replaces the old result.** If the creature already has an initiative, rolling
  again clears it and rolls a new one. Foundry would otherwise ignore the second roll.
- **Identical creatures share one roll.** This is dnd5e's own **"Roll Once per Creature"** setting
  (in the system's combat settings). Unlinked copies of the same creature on the same side share
  one initiative. Roll Model makes that sharing survive re-rolls:
  - re-rolling **any one** of them re-rolls **the whole group** to one new shared number;
  - changing advantage or disadvantage on the initiative card moves **the whole group**.

  dnd5e only makes a new creature share a group's initiative **before the combat has started**.
  A copy added mid-combat rolls its own.

> The separate *Shared NPC Initiative* module is no longer needed and **must stay disabled**. Its
> saved result would keep handing back the old number on re-rolls.

---

## 8. Applying damage and tracking who took it

When anyone presses **Apply Damage** on a card, Roll Model records **which tokens it went to and
how much each actually took** (after resistances, the save multiplier, temp HP and so on). The GM
saves this record; a player's click is passed to the GM's client automatically.

- **On save cards**, the amount appears in each target's Results row.
- **On other damage/healing cards**, a **Results** block lists each token with the amount it took.
  This block, and the greyed-out Apply button described below, are part of **Acknowledged Mode**
  and need it turned on in settings. The recording itself happens either way.
- The amounts are colour-coded:

  | Colour category | Meaning |
  |---|---|
  | full | took exactly the card's total |
  | reduced | took less (resistance, half on a save…) |
  | vulnerable | took more than the total |
  | zero | immune or fully blocked |
  | healing | was healed |
  | temp | received temporary HP |

- **Protection against applying damage twice:** if every token you have selected has already taken
  this card's damage, the Apply button greys out. Pressing it anyway asks *"Apply damage again?"*.
  If you say yes, it applies to the tokens that were selected **when you pressed the button**.

---

## 9. Character and feat automation

These are **matched by item or feature name**. Renaming the item on the sheet turns the
automation off.

| Feature | Name it looks for | What happens |
|---|---|---|
| **Great Weapon Master** | feat `Great Weapon Master` | On weapons with the **Heavy** property, adds your proficiency bonus to damage, labelled *"Great Weapon Master"*. A **GWM** checkbox on the card removes or re-adds it after the roll. |
| **Elemental Fury: Potent Spellcasting** (Druid) | feat `Elemental Fury: Potent Spellcasting` | Adds your **Wisdom modifier** to damage from **druid cantrips**. Excludes Magic Stone and Shillelagh. |
| **Potent Spellcasting** (Cleric) | feat `Potent Spellcasting` | Same, for **cleric cantrips**. |
| **Lunar Radiance** (Wabu) | feat `Improved Circle Forms` on the *original* druid | While wild shaped, the beast form's damage gets **radiant** as a choosable type (use the damage-type pills). |
| **Celestial Revelation** (Aasimar) | race containing "Aasimar", with an active effect named `Necrotic Shroud (Self)`, `Inner Radiance` or `Heavenly Wings` | Attack cards get a **CR** checkbox. Ticking it adds extra damage equal to your proficiency bonus, necrotic for Necrotic Shroud and radiant for the other two. |
| **Portent** / **Greater Portent** (Divination) | feat `Portent` or `Greater Portent` | On a long rest, rolls 2 d20s (3 with Greater Portent) and adds them to the rest's chat card. The dice also appear next to the feat on the character sheet. **Click them there** to post them to chat, then click a die in that chat card to mark it used. |
| **Blessing of the Raven Queen** | feat `Blessing of the Raven Queen` | A long rest restores **Inspiration**. |
| **Book of the Dead** | any item `Book of the Dead` | A long rest heals up to **300 HP**, capped at max HP. |
| **Healing bonus only on spells** | — | The actor's healing bonus is **left off** heals that don't come from spells, such as *Lay on Hands*. |
| **Pooled healing and upcast spells** | — | Remembers the amount you chose (Lay on Hands) or the slot level (*Fireball* at 4th), so the damage/healing rolled afterwards uses it. dnd5e doesn't reliably store this itself. |

Wild shape effect toggling for Wabu lives in the **character-features** submodule, not here.

---

## 10. Table and canvas extras

### HP widget

A small always-on-top bar showing the selected token's HP, temp HP and death saves. Toggle it with
the **briefcase-medical** button in the Token controls, or with the *Toggle HP Widget* keybinding
(unbound by default; set it in Configure Controls).
Drag it anywhere; it remembers its position per user.

| Input / button | Effect |
|---|---|
| type `8`, Enter | 8 damage |
| type `+8`, Enter | heal 8 |
| suffix `t` (e.g. `5t`) | apply to temp HP |
| suffix `r` | skip temp HP, hit regular HP |
| suffix `m` | change max HP (temp max) |
| hurt / heal buttons | damage or heal by the typed amount |
| skull button | drop to 0 HP and mark **defeated**. Shift-click toggles defeated only. Right-click drops to 0 without the status. |
| full-heal button | heal to max and clear defeated. Right-click heals without touching the status. |
| death-save pips | click to add, right-click to remove |

The *Focus HP Input* keybinding opens the widget with the cursor in the box. **Esc no longer closes
the widget** along with other windows, unless the Monk's Active Tiles module is installed.

### Turn-start marker

When a combatant's turn starts, the square they started on gets a purple outline of corner brackets
with an **"S"** in the middle, so you can see where they came from as they move. Set in
[Settings](#11-settings) to all tokens, player characters only, or off.

### No movement history

Tokens don't record movement history (the dotted "path so far" trail). Can be turned off in
settings, and takes effect immediately.

### Combat carousel width

The carousel combat tracker is kept narrow enough not to slide under the chat sidebar when there
are many combatants.

---

## 11. Settings

All under **Module Settings → Sigil Tools → Roll Model** unless noted.

| Setting | Default | What it does |
|---|---|---|
| **Collapse Settings** (button) | — | Items listed here keep their description **expanded** on chat cards. |
| **Prevent Movement History** | on | See [above](#no-movement-history). |
| **Show Turn-Start Position** | All Tokens | All tokens / player characters only / disabled. Needs a reload. |
| **Acknowledged Mode** | on | Shows the **Results** block of applied damage on non-save cards. Damage is recorded either way. |
| **Debug Logs** *(General)* | off | Per-browser. Prints Roll Model's detailed `[RM DEBUG]` trace to the console. |
| **Enable: Roll Model** *(Submodules)* | on | Master switch for everything on this page. Needs a reload. |

Related settings elsewhere:

- dnd5e **"Allow Player Damage Application"**: whether players get the damage tray at all.
- dnd5e **"Roll Once per Creature"**: shared initiative (see [section 7](#7-initiative)).
- dnd5e **"Auto-collapse Chat Trays"**: honoured for the damage tray on combined cards.
- dnd5e **"Attack Roll Visibility"**: whether players see hit/miss on attack rows.

---

## 12. How it works (for maintainers)

### The pipeline in one paragraph

Roll Model marks things on the chat message (flags under `rm`) at dnd5e's `preUse…` / `preRoll…`
hooks: whether it should quick-roll, whether it's advantage or disadvantage, and which rows to
render. When a usage card is created, it is hidden (`rm-hide`) and its author's client rolls the
attack, damage and formula through the activity's own `rollAttack` / `rollDamage` /
`rollFormula`, with `create: false`. The results go into the usage message's `rolls` and it is
marked `processed`. On every render (`dnd5e.renderChatMessage`), `ChatUtility.processChatMessage`
rebuilds the rows from those stored rolls using dnd5e's own `roll-compact.hbs` template, so the
card looks native. Anything that changes a roll later (retro buttons, pills, toggles) edits the
stored `rolls` and saves the message. The next render then draws the new state.

dnd5e 6.0's own "roll the attack right after use" step is switched off with
`usageConfig.subsequentActions = false`, so it doesn't pop a second dialog.

### Files

| File | Responsibility |
|---|---|
| `roll-model.js` | Entry point. Also imports the character-features, visual-auras, chat-archive, active-auras and effect-autocomplete submodules. |
| `utils/hooks.js` | All hook and patch registration. Also holds Portent, the rest automations, the initiative re-roll patch, the turn-start marker, movement history, the roll-mode patch and the duplicate-save dialog. |
| `utils/roll.js` | Quick-roll decisions (`processRoll`, `processActivity`), retro adv/dis/downgrade, bonus-label capture for breakdowns, and the GWM / Potent Spellcasting / Lunar Radiance / heal-bonus damage hooks. |
| `utils/activity.js` | Decides which rows a card gets (`setRenderFlags`) and performs the rolls for an unprocessed card (`runActivityActions`). |
| `utils/chat.js` | Everything drawn on cards: rows, breakdowns, trays, save rows, Results rows, retro buttons, pills, GWM/CR toggles, concentration button, scroll handling. |
| `utils/ack.js` | Applied-damage recording and the Results block / Apply-button greying. |
| `utils/core.js` | Helpers: keybinding checks, roll sound, initiative-group lookup. |
| `utils/render.js`, `config/templates.js`, `/templates/rm-section.html` | The section-row template every card row is built on. |
| `apps/CollapseSettingsApp.js` | The Collapse Settings window. |
| `../always-hp/` | The HP widget. |
| `roll-model.css` | All card styling, including the combat-carousel width fix. |

### Stored data

| Where | Key | Holds |
|---|---|---|
| ChatMessage | `flags.rm.*` | quickRoll / processed / advantage / disadvantage / versatile, which rows to render, isCritical / isMaximized, snapshots of the original rolls for CRIT/MAX/adv undo (`baseRollsJSON`, `critRollsJSON`, `baseAttackRollJSON`), GWM and CR state, ammunition, healing/spell scaling |
| ChatMessage | `flags.sigil-tools.appliedTo` | `[{uuid, name, damage, isTemp}]`, the tokens this card's damage was applied to |
| Actor | `flags.sigil-tools.portentRolls` | `[{value, used}]` |
| User | `flags.sigil-tools.damageTypePrefs.<item uuid>` | the chosen damage type per damage part |
| User | `flags.sigil-tools.alwayshpPos`, `alwayshpShowDialog` | HP widget position and visibility |

### Socket messages (`module.sigil-tools`, handled by the GM)

| `type` | Sent when |
|---|---|
| `ackAppliedTo` | a player applies damage (record the targets) |
| `retroDamage` | a player uses CRIT/MAX on a card they don't own |

### Patches on Foundry/dnd5e (libWrapper)

- `Actor.prototype.rollInitiative`: always pass `rerollInitiative: true`, so rolling from the
  sheet replaces an existing result.
- `CONFIG.Combat.documentClass.prototype.rollInitiative` (dnd5e's `Combat5e`, wrapped at `setup`):
  when a combatant that already has initiative is rolled again, from any source (sheet, tracker
  menu, carousel), clear its whole "Roll Once per Creature" group, roll once, and copy the result
  to the group. It must wrap dnd5e's class rather than core's `Combat`, because `Combat5e` works
  out the shared values before calling core's method.
- `TokenDocument#_shouldRecordMovementHistory`: movement history off.
- `ChatMessage.prototype.applyRollMode` → `applyMode`: silences a v14 deprecation warning.
- `core.dismiss` keybinding: replaced so Esc skips the HP widget. This one is a direct patch,
  not libWrapper.

### Things that are fragile

- **dnd5e card markup.** Row insertion keys off dnd5e 6.0 class names (`.chat-card > .icon-row`,
  `.card-summary`, `button.dice-roll + .roll-breakdown[popover]`, `damage-application`,
  `target-pill`…). A dnd5e redesign of the chat cards will need these updating.
- **dnd5e private APIs.** Parts of the code rely on internals that could change without notice:
  `message.system._prepareButtons()`, `message._targetState`, `tray.getMergedOptions`,
  `onDescendentRefresh`, `ActiveEffect5e._manageConcentration`.
- **Name matching.** Every automation in [section 9](#9-character-and-feat-automation) depends on
  exact item names.
- **Bonus labelling** matches bonuses to sources by value. Equal values can swap labels.
- **Formula DCs.** Saves use whatever DC dnd5e stores on the card. The pre-6.0 save code used the
  DC printed on the button, which mattered for Sheyla's Relentless Rage (`10 + 5 × uses spent`).
  That code has been removed, so test that feature when the save flow changes.

### Checking for dead code

`npm run check` runs ESLint and then knip. knip is pinned to v5 because v6 dropped unused
class-member detection, and most of this code lives in static utility classes. Neither tool can
see code that is dead only because no data triggers it any more (e.g. a branch for a flag nothing
sets), so those still need finding by reading the code.
