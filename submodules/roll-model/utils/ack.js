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
        if ($html.find(".rm-ack-badge").length) return;

        const label = appliedTo ? `Applied to ${Array.isArray(appliedTo) ? appliedTo.join(", ") : appliedTo}` : `Applied by ${acknowledged}`;

        const badge = $(`<div class="rm-ack-badge"><i class="fas fa-check"></i> ${label}</div>`);
        const card = $html.find(".dnd5e2.chat-card, .chat-card").first();
        (card.length ? card : $html).prepend(badge);
    }

    static registerApplyListener() {
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
                const targetNames = damageApp
                    ? [...damageApp.querySelectorAll("[data-target-uuid]")].map((t) => fromUuidSync(t.dataset.targetUuid)?.name).filter(Boolean)
                    : [];
                if (!targetNames.length) return;
                if (game.user.isGM) {
                    _mergeAppliedTo(message, targetNames);
                } else {
                    game.socket.emit(`module.${MODULE_NAME}`, {
                        type: "ackAppliedTo",
                        messageId: message.id,
                        targetNames,
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
            if (message) _mergeAppliedTo(message, data.targetNames);
        });
    }
}

async function _mergeAppliedTo(message, newNames) {
    const existing = message.getFlag(MODULE_NAME, "appliedTo");
    const merged = [...new Set([...(Array.isArray(existing) ? existing : []), ...newNames])];
    await message.setFlag(MODULE_NAME, "appliedTo", merged);
}


