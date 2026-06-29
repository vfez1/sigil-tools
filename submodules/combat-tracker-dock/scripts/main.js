import { initConfig } from './config.js';
import {registerSettings} from './settings.js';
import {CombatDock} from './app/CombatDock.js';
import {CombatantPortrait} from './app/CombatantPortrait.js';
import {defaultAttributesConfig, generateDescription} from './systems.js';
import { showWelcome } from './lib/welcome.js';

export const MODULE_ID = 'sigil-tools';
export const TEMPLATE_PATH = `modules/sigil-tools/submodules/combat-tracker-dock/templates`;

export function getCurrentCombat(){
    return ui.combat.viewed;
}

Hooks.once('init', function () {
    registerWrappers();
    registerHotkeys();
    CONFIG.combatTrackerDock = {
        CombatDock,
        CombatantPortrait,
        defaultAttributesConfig,
        generateDescription,
        INTRO_ANIMATION_DURATION: 1000,
        INTRO_ANIMATION_DELAY: 0.25,
    };
    Hooks.callAll(`${MODULE_ID}-init`, CONFIG.combatTrackerDock);
});

Hooks.on('ready', () => {
    registerSettings();
    initConfig();
    const currentCombat = getCurrentCombat();
    if (currentCombat && !ui.combatDock) {
        new CONFIG.combatTrackerDock.CombatDock(currentCombat).render(true);
    }
    showWelcome();
});

Hooks.on('createCombat', (combat) => {
    if (game.combat === combat) {
        new CONFIG.combatTrackerDock.CombatDock(combat).render(true);
    }
});

Hooks.on('updateCombat', (combat, updates) => {
    if(updates.active || updates.scene === null) {
        new CONFIG.combatTrackerDock.CombatDock(combat).render(true);
    }
    if(updates.scene && combat.scene !== game.scenes.viewed && ui.combatDock?.combat === combat) {
        ui.combatDock.close();
    }
});

Hooks.on('renderCombatDock', (_app, html) => {
    const root = html instanceof HTMLElement ? html : html[0];
    if (!root) return;

    const nextTurnBtn = root.querySelector('[data-action="next-turn"]');
    if (nextTurnBtn) {
        nextTurnBtn.style.background = "#1a4a1a";
    }

    const nextRoundBtn = root.querySelector('[data-action="next-round"]');
    if (nextRoundBtn) {
        nextRoundBtn.addEventListener("click", async (e) => {
            e.stopImmediatePropagation();
            const confirmed = await foundry.applications.api.DialogV2.confirm({
                window: { title: "Next Round" },
                content: "<p>Are you sure you want to advance to the next round?</p>",
                rejectClose: false,
                position: { width: 300 },
            });
            if (confirmed) game.combat?.nextRound();
        }, true);
    }

    const prevRoundBtn = root.querySelector('[data-action="previous-round"]');
    if (prevRoundBtn) {
        prevRoundBtn.addEventListener("click", async (e) => {
            e.stopImmediatePropagation();
            const confirmed = await foundry.applications.api.DialogV2.confirm({
                window: { title: "Previous Round" },
                content: "<p>Are you sure you want to go back to the previous round?</p>",
                rejectClose: false,
                position: { width: 300 },
            });
            if (confirmed) game.combat?.previousRound();
        }, true);
    }
});

Hooks.on('canvasReady', () => {
    Hooks.once("renderCombatTracker", (tab) => {
        if (ui.combatDock) return;
        const currentCombat = getCurrentCombat();
        if(currentCombat) {
            new CONFIG.combatTrackerDock.CombatDock(currentCombat).render(true);
        } else {
            ui.combatDock?.close();
        }
    });
});


function registerWrappers() {
    if (!game.modules.get("lib-wrapper")?.active) return;

    libWrapper.register(MODULE_ID, "Combatant.prototype.visible", function (wrapped, ...args) {
        const visible = wrapped(...args);
        if (!ui.combatDock?.rendered) return visible;
        const cDVisible = ui.combatDock.portraits.find((p) => p.combatant == this)?.firstTurnHidden;
        return visible && !cDVisible;
    });
}

function registerHotkeys() {
    game.keybindings.register(MODULE_ID, "combatPrev", {
        name: `${MODULE_ID}.hotkeys.combatPrev.name`,
        editable: [{ key: "KeyN", modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT] }],
        restricted: false,
        onDown: () => {},
        onUp: () => {
            if (!game.combat) return;
            const isOwner = game.combat.combatant?.isOwner;
            if (!isOwner) return;
            game.combat.previousTurn();
        },
    });

    game.keybindings.register(MODULE_ID, "combatNext", {
        name: `${MODULE_ID}.hotkeys.combatNext.name`,
        editable: [{ key: "KeyM", modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT] }],
        restricted: false,
        onDown: () => {},
        onUp: () => {
            if (!game.combat) return;
            const isOwner = game.combat.combatant?.isOwner;
            if (!isOwner) return;
            game.combat.nextTurn();
        },
    });
}
