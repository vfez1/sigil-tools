import { MODULE_NAME } from "../../shared/const.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

export class AcknowledgedModeUtility {
    static onNewMessage(_message, _html) {}

    static applyAcknowledgedStyle(message, html) {
        const appliedTo = message.getFlag(MODULE_NAME, "appliedTo");
        const acknowledged = message.getFlag(MODULE_NAME, "acknowledged");
        if (!appliedTo && !acknowledged) return;

        const $html = $(html);
        $html.addClass("rm-acknowledged");

        // Badge — only insert once; tray marking runs every render
        if (!$html.find(".rm-ack-badge").length) {
            let badgeInner;
            if (appliedTo) {
                const entries = Array.isArray(appliedTo) ? appliedTo : [appliedTo];
                const nameItems = entries.map(e => {
                    const name = typeof e === "string" ? e : e.name;
                    const dmg = typeof e === "object" && e.damage != null
                        ? `<span class="rm-ack-damage">${e.damage}</span>`
                        : `<span class="rm-ack-damage"></span>`;
                    return `<span class="rm-ack-name">${name}</span>${dmg}`;
                }).join("");
                badgeInner = `<span class="rm-ack-prefix">Applied to</span><span class="rm-ack-names">${nameItems}</span>`;
            } else {
                badgeInner = `<span class="rm-ack-prefix">Applied by ${acknowledged}</span>`;
            }

            const badge = $(`<div class="rm-ack-badge"><i class="fas fa-check"></i><div class="rm-ack-content">${badgeInner}</div></div>`);
            const messageContent = $html.find(".message-content").first();
            if (messageContent.length) {
                messageContent.prepend(badge);
            } else {
                const header = $html.find(".message-header").first();
                header.length ? badge.insertAfter(header) : $html.prepend(badge);
            }
        }

        // Defer button marking by one frame to let <damage-application> render its children.
        if (appliedTo) {
            const entries = Array.isArray(appliedTo) ? appliedTo : [appliedTo];
            const appliedNames = new Set(entries.map(e => typeof e === "string" ? e : e.name));
            const root = html instanceof $ ? html[0] : html;
            requestAnimationFrame(() => _markApplyButton(root, appliedNames));
        }
    }

    static registerApplyListener() {
        // Re-mark apply buttons whenever token selection changes (tray re-renders on controlToken)
        Hooks.on("controlToken", () => {
            requestAnimationFrame(() => {
                for (const message of game.messages) {
                    const appliedTo = message.getFlag(MODULE_NAME, "appliedTo");
                    if (!appliedTo) continue;
                    const entries = Array.isArray(appliedTo) ? appliedTo : [appliedTo];
                    const appliedNames = new Set(entries.map(e => typeof e === "string" ? e : e.name));
                    const li = document.querySelector(`[data-message-id="${message.id}"]`);
                    if (!li) continue;
                    _markApplyButton(li, appliedNames);
                }
            });
        });

        // Capture phase so we fire before _handleClickHeader's stopImmediatePropagation
        document.addEventListener(
            "click",
            (e) => {
                if (!SettingsUtility.getSettingValue(SETTING_NAMES.ACK_MODE)) return;
                const btn = e.target.closest(".apply-damage[data-action='applyDamage'], button.apply-damage");
                if (!btn) return;
                const li = btn.closest("[data-message-id]");
                if (!li) return;
                const message = game.messages.get(li.dataset.messageId);
                if (!message) return;
                const hasDamage = message.rolls?.some((r) => r instanceof CONFIG.Dice.DamageRoll);
                if (!hasDamage) return;
                const damageApp = btn.closest("damage-application");
                const targets = damageApp
                    ? [...damageApp.querySelectorAll("[data-target-uuid]")].map((t) => {
                        // UUID may be Scene.x.Token.y.Actor.z (synthetic token-actor).
                        // Strip the embedded actor suffix to resolve the TokenDocument directly.
                        const uuid = t.dataset.targetUuid;
                        const tokenUuid = uuid.replace(/\.Actor\.[^.]+$/, "");
                        const resolved = fromUuidSync(tokenUuid !== uuid ? tokenUuid : uuid);
                        if (!resolved) return null;
                        const token = resolved.documentName === "Token" ? resolved
                            : canvas.scene?.tokens?.find(tk => tk.actorId === resolved.id);
                        if (token?.hidden) return null;
                        const name = token?.name ?? resolved.name;
                        const damageEl = t.querySelector(".calculated.damage, .calculated, .total, .adjustment");
                        const damage = damageEl ? (parseInt(damageEl.textContent?.trim()) || null) : null;
                        return { name, damage };
                    }).filter(Boolean)
                    : [];
                if (!targets.length) return;
                if (game.user.isGM) {
                    _mergeAppliedTo(message, targets);
                } else {
                    game.socket.emit(`module.${MODULE_NAME}`, {
                        type: "ackAppliedTo",
                        messageId: message.id,
                        targets,
                    });
                }
            },
            true
        ); // true = capture phase, fires before dnd5e's stopImmediatePropagation
    }

    static registerSocketListener() {
        game.socket.on(`module.${MODULE_NAME}`, (data) => {
            if (!game.user.isGM) return;
            if (data.type !== "ackAppliedTo") return;
            const message = game.messages.get(data.messageId);
            if (message) _mergeAppliedTo(message, data.targets);
        });
    }
}

function _markApplyButton(root, appliedNames) {
    const damageApp = root.querySelector("damage-application");
    if (!damageApp) return;
    const applyBtn = damageApp.querySelector("button[data-action='applyDamage']:not(.unbutton)");
    if (!applyBtn) return;

    // Use currently controlled tokens — avoids depending on damage-application tray re-render timing
    const controlled = canvas.tokens?.controlled ?? [];
    if (!controlled.length) {
        applyBtn.classList.remove("rm-already-applied");
        return;
    }

    const allApplied = controlled.every(t => appliedNames.has(t.name));
    if (allApplied) {
        applyBtn.classList.add("rm-already-applied");
    } else {
        applyBtn.classList.remove("rm-already-applied");
    }
}

async function _mergeAppliedTo(message, newTargets) {
    const existing = message.getFlag(MODULE_NAME, "appliedTo") ?? [];
    // Normalise legacy string entries to objects
    const existingArr = (Array.isArray(existing) ? existing : [existing]).map(e =>
        typeof e === "string" ? { name: e, damage: null } : e
    );
    const nameSet = new Set(existingArr.map(e => e.name));
    for (const t of newTargets) {
        if (!nameSet.has(t.name)) existingArr.push(t);
    }
    await message.setFlag(MODULE_NAME, "appliedTo", existingArr);
}
