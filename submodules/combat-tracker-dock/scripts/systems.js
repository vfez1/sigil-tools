/*
 * -------------------------------------------------------------
 * Community Maintained
 * -------------------------------------------------------------
 *
 * This file is maintained by the community and is subject to the
 * terms of the MIT License.
 *
 * For more information, please visit:
 * https://opensource.org/licenses/MIT
 *
 * -------------------------------------------------------------
 */

import { registerSystemSetting } from "./settings.js";

/**
 * Generates a description for the given actor based on its data.
 * This description is shown in the Tooltip under the actor's name.
 *
 * @param {Object} actor - The actor object.
 * @returns {string|null} The generated description or null if no description is available.
 */

export function generateDescription(actor) {
    const { type, system } = actor;
    switch (game.system.id) {
        case "dnd5e":
            const isNPC = type === "npc";
            const isPC = type === "character";
            if (isNPC) {
                const creatureType = game.i18n.localize(CONFIG.DND5E.creatureTypes[actor.system.details.type.value]?.label ?? actor.system.details.type.custom);
                const cr = system.details.cr >= 1 || system.details.cr <= 0 ? system.details.cr : `1/${1 / system.details.cr}`;
                return `CR ${cr} ${creatureType}`;
            } else if (isPC) {
                const classes = Object.values(actor.classes)
                    .map((c) => c.name)
                    .join(" / ");
                return `Level ${system.details.level} ${classes} (${system.details.race})`;
            } else {
                return null;
            }
        case "dnd4e":
            switch (type) {
                case "Player Character":
					return `${game.i18n.localize("DND4E.Level")} ${system.details.level} ${system.details.race} ${system.details.class} (${system.details.alignment})`;
                case "NPC":
					return `${CONFIG.DND4E.actorSizes[actor.system.details.size]?.label} ${CONFIG.DND4E.creatureOrigin[actor.system.details.origin]?.label} ${CONFIG.DND4E.creatureType[actor.system.details.type]?.label}`;
				default:
					return null;
			}
        case "swade":
            if (system?.wildcard) return `${game.i18n.localize("SWADE.WildCard")}`;
            switch (type) {
                case "character":
                case "npc":
                    return `${game.i18n.localize("SWADE.Extra")}`;
                case "vehicle":
                    return game.i18n.localize("TYPES.Actor.vehicle");
                default:
                    return null;
            }
        case "pirateborg":
            switch (type) {
                case "character":
                    const classes = [actor.characterClass?.name || "Character"];
                    if (actor.characterBaseClass?.name) {
                        classes.push(actor.characterBaseClass.name);
                    }
                    return classes.join(" - ");
                case "creature":
                    return "Creature";
                case "vehicle":
                case "vehicle_npc":
                    return "Ship";
                default:
                    return null;
            }
        case "cyphersystem":
            switch (type) {
                case "pc":
                    return "Character";
                case "npc":
                    return "Creature";
                case "companion":
                    return "Companion";
                case "community":
                    return "Community";
                case "vehicle":
                    return "Vehicle";
                case "marker":
                    return "Marker";
                default:
                    return null;
            }
        case "pf2e":
            switch (type) {
                case "character":
                    return `Level ${system.details.level.value} ${system.details.class.name} (${system.details.ancestry.name})`;
                default:
                    return null;
            }
        case "crucible":
            if (actor.type === "hero") return `${system.details.ancestry.name} ${system.details.background.name} ${system.details.signatureName ? `(${system.details.signatureName})` : ""}`;
            if (actor.type === "adversary") return `${system.details.taxonomy.name} ${system.details.archetype.name} (${game.i18n.localize("ADVANCEMENT.Level")} ${system.details.level} ${game.i18n.localize("ADVERSARY.Threat" + system.details.threat.charAt(0).toUpperCase() + system.details.threat.slice(1))})`;
        case "wfrp4e":
            switch (type) {
                case "character":
                    return `${actor.Species} ${actor.currentCareer.name}`;
                case "npc":
                    const length = actor.itemTypes.career.length - 1;
                    if (length < 0) {
                        return `${actor.Species}`;
                    } else {
                        const careers = Object.values(actor.itemTypes.career).map((c) => c.name);
                        const career = careers[length];
                        return `${actor.Species} ${career}`;
                    }
                case "creature":
                    return `${actor.Species}`;
                default:
                    return null;
            }
        case "alienrpg":
            switch (type) {
                case "character":
                    let career;
                    if (system.general.career.value == 1) career = game.i18n.localize("ALIENRPG.ColonialMarine");
                    else if (system.general.career.value == 2) career = game.i18n.localize("ALIENRPG.ColonialMarshal");
                    else if (system.general.career.value == 3) career = game.i18n.localize("ALIENRPG.CompanyAgent");
                    else if (system.general.career.value == 4) career = game.i18n.localize("ALIENRPG.Kid");
                    else if (system.general.career.value == 5) career = game.i18n.localize("ALIENRPG.Medic");
                    else if (system.general.career.value == 6) career = game.i18n.localize("ALIENRPG.Mercenary");
                    else if (system.general.career.value == 7) career = game.i18n.localize("ALIENRPG.Officer");
                    else if (system.general.career.value == 8) career = game.i18n.localize("ALIENRPG.Pilot");
                    else if (system.general.career.value == 9) career = game.i18n.localize("ALIENRPG.Roughneck");
                    else if (system.general.career.value == 10) career = game.i18n.localize("ALIENRPG.Scientist");
                    else if (system.general.career.value == 11) career = game.i18n.localize("ALIENRPG.Synthetic");
                    else if (system.general.career.value == 12) career = game.i18n.localize("ALIENRPG.Homebrew");
                    if (actor.itemTypes.specialty.length == 0) return `${career}`;
                    else if (actor.itemTypes.specialty.length == 1) {
                        const specialties = Object.values(actor.itemTypes.specialty).map((c) => c.name);
                        const specialty = specialties[0];
                        return `${career}: ${specialty}`;
                    }
                case "synthetic":
                    let careersynth;
                    if (system.general.career.value == 1) careersynth = game.i18n.localize("ALIENRPG.ColonialMarine");
                    else if (system.general.career.value == 2) careersynth = game.i18n.localize("ALIENRPG.ColonialMarshal");
                    else if (system.general.career.value == 3) careersynth = game.i18n.localize("ALIENRPG.CompanyAgent");
                    else if (system.general.career.value == 4) careersynth = game.i18n.localize("ALIENRPG.Kid");
                    else if (system.general.career.value == 5) careersynth = game.i18n.localize("ALIENRPG.Medic");
                    else if (system.general.career.value == 6) careersynth = game.i18n.localize("ALIENRPG.Mercenary");
                    else if (system.general.career.value == 7) careersynth = game.i18n.localize("ALIENRPG.Officer");
                    else if (system.general.career.value == 8) careersynth = game.i18n.localize("ALIENRPG.Pilot");
                    else if (system.general.career.value == 9) careersynth = game.i18n.localize("ALIENRPG.Roughneck");
                    else if (system.general.career.value == 10) careersynth = game.i18n.localize("ALIENRPG.Scientist");
                    else if (system.general.career.value == 11) careersynth = game.i18n.localize("ALIENRPG.Synthetic");
                    else if (system.general.career.value == 12) careersynth = game.i18n.localize("ALIENRPG.Homebrew");
                    if (actor.itemTypes.specialty.length == 0) return `${careersynth}`;
                    else if (actor.itemTypes.specialty.length == 1) {
                        const specialties = Object.values(actor.itemTypes.specialty).map((c) => c.name);
                        const specialty = specialties[0];
                        return `${careersynth}: ${specialty}`;
                    }
                case "spacecraft":
                    return `${game.i18n.localize("ALIENRPG.MODEL")}: ${system.attributes.model}`;
                default:
                    return null;
            }
        case "exaltedthird":
            switch (type) {
                case "character":
                case "npc":
                    return `${game.i18n.localize("Ex3.Essence")} ${system.essence.value}`;
                default:
                    return null;
            }
        case "exaltedessence":
            switch (type) {
                case "character":
                case "npc":
                    return `${game.i18n.localize("ExEss.Essence")} ${system.essence.value}`;
                default:
                    return null;
            }
        case "swnr":
            switch (type) {
                case "character":
                    return `${game.i18n.localize("swnr.sheet.level")} ${system.level.value} ${system.background} ${system.class}`;
                case "npc":
                    return "NPC";
                case "vehicle":
                    return "Vehicle";
                case "ship":
                    return "Ship";
                case "drone":
                    return "Drone";
                case "mech":
                    return "Mech";
                default:
                    return null;
            }
        case "wwn":
            switch (type) {
                case "Character":
                    return `Level ${system.details.level} ${system.details.background} ${system.details.class}`;
                case "Faction":
                    return "Faction";
                case "Monster":
                    return `${system.hp.hd} hit dice Monster`;
                default:
                    return null;
            }
        case "ars":
            switch (type) {
                case "character":
                    return "Player Character";
                case "lootable":
                    return "Loot";
                case "merchant":
                    return "Merchant";                    
                case "npc":
                    return "Non-Player-Character";
                default:
                    return null;
            }            
        case "lancer":
            return game.lancer.combatTrackerDock?.generateDescription(actor);
        case "shadowdark":
            switch (type) {
                case "Player":
                case "NPC":
                    return `Level: ${system.level.value}`;
                default:
                    return null;
            }
    }
}

/**
 * Retrieves the display information for the initiative of a combatant based on the game system.
 * The icon can be both a font-awesome icon or an image.
 *
 * @param {Object} combatant - The combatant object.
 * @returns {Object} The initiative display information, including value, icon, and roll icon.
 */

export function getInitiativeDisplay(combatant) {
    switch (game.system.id) {
        case "swade": {
            let suit = "";
            const getCardImage = (cardstr) => {
                return Array.from(game.cards.get(game.settings.get("swade", "actionDeck")).cards).find((c) => c.description === cardstr)?.img;
            };
            let cardString = combatant?.cardString ?? "";
            if (cardString.includes("♥")) suit = "fas fa-heart";
            else if (cardString.includes("♦")) suit = "fas fa-diamond";
            else if (cardString.includes("♣")) suit = "fas fa-club";
            else if (cardString.includes("♠")) suit = "fas fa-spade";
            else if (cardString === "Red J" || cardString === "Blk J") cardString = "JK";

            return {
                value: cardString,
                icon: getCardImage(combatant?.cardString ?? "") ?? suit,
                rollIcon: "far fa-cards-blank",
            };
        }
        case "wfrp4e": {
            return {
                value: combatant?.initiative,
                icon: "far fa-dice-d10",
                rollIcon: "far fa-dice-d10",
            };
        }
        case "alienrpg": {
            return {
                value: combatant?.initiative,
                icon: "far fa-cards-blank",
                rollIcon: "fa-solid fa-cards-blank",
            };
        }
        case "exaltedthird": {
            return {
                value: combatant?.initiative,
                icon: "far fa-dice-d10",
                rollIcon: "far fa-dice-d10",
            };
        }
        case "exaltedessence": {
            return {
                value: combatant?.initiative,
                icon: "far fa-dice-d10",
                rollIcon: "far fa-dice-d10",
            };
        }
        case "lancer":
            return (
                game.lancer.combatTrackerDock?.getInitiativeDisplay(combatant) ?? {
                    value: combatant?.initiative,
                    icon: "fas fa-dice-d20",
                    rollIcon: "fas fa-dice-d20",
                }
            );
        case "dnd4e":
            return {
				value: combatant?.initiative ? parseInt(combatant.initiative).toString() : null,
				icon: "fas fa-dice-d20",
				rollIcon: "fas fa-dice-d20",
			};	
        default:
            return {
                value: combatant?.initiative,
                icon: "far fa-dice-d20",
                rollIcon: "far fa-dice-d20",
            };
    }
}

/**
 * Register settings for specific game systems.
 * This function is called once on startup.
 * When you need to get the setting value, use `getSystemSetting(key) helper`.
 */

export function registerSystemSettings() {
    switch (game.system.id) {
        case "crucible":
            registerSystemSetting("alwaysShowActions", {
                scope: "world",
                config: true,
                type: Boolean,
                default: true,
                onChange: () => ui.combatDock?.refresh(),
            });
            break;
        default:
            break;
    }
}
