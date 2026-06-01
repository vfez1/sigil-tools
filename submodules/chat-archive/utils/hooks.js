import { MODULE_NAME } from "../../shared/const.js";
import { isEnabled } from "../../shared/enable.js";
import { SETTING_NAMES } from "../../shared/settings.js";
import { ARCHIVE_SETTINGS } from "./settings.js";


let _archiveInProgress = false;

async function autoArchiveMessages() {
    if (!game.ready) return;
    if (!game.user.isGM) return;
    if (_archiveInProgress) return;

    _archiveInProgress = true;
    try {
        const keepCount = game.settings.get(MODULE_NAME, ARCHIVE_SETTINGS.KEEP_COUNT);
        const allMessages = [...game.messages].sort((a, b) => a.timestamp - b.timestamp);
        const toArchive = allMessages.slice(0, Math.max(0, allMessages.length - keepCount));
        if (!toArchive.length) return;

        const url = game.settings.get(MODULE_NAME, ARCHIVE_SETTINGS.URL);
        const messages = await _renderMessages(toArchive);

        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages }),
            });
        } catch (e) {
            console.error(`[chat-archive] Auto-archive failed: could not reach server (${e.message}).`);
            return;
        }

        if (!res.ok) {
            console.error(`[chat-archive] Auto-archive server error: ${res.status}.`);
            return;
        }

        const data = await res.json().catch(() => ({ count: toArchive.length }));
        await ChatMessage.deleteDocuments(toArchive.map(m => m.id));
        console.log(`[chat-archive] Auto-archived ${data.count ?? toArchive.length} messages.`);
    } finally {
        _archiveInProgress = false;
    }
}

async function _renderMessages(toArchive) {
    const messages = [];
    for (const msg of toArchive) {
        let html = msg.content ?? "";
        try {
            const li = await msg.renderHTML();
            const needsInjection = msg.flags?.rm?.renderAttack || msg.flags?.rm?.renderDamage;
            if (needsInjection) {
                await new Promise(resolve => {
                    if (li.querySelector(".rm-section-attack, .rm-section-damage")) { resolve(); return; }
                    li.addEventListener("rm-inject-complete", resolve, { once: true });
                    setTimeout(resolve, 3000);
                });
            }
            html = li.outerHTML;
        } catch(e) {
            console.error("[chat-archive] renderHTML failed for", msg.id, e);
        }
        messages.push({
            id: msg.id,
            timestamp: msg.timestamp,
            speaker: msg.speaker,
            flavor: msg.flavor ?? "",
            html,
        });
    }
    return messages;
}

// function injectArchiveButton(controlButtons) {
//     if (!controlButtons) return;
//     if (controlButtons.querySelector(".chat-archive-btn")) return;
//
//     const btn = document.createElement("button");
//     btn.type = "button";
//     btn.className = "ui-control icon fa-solid fa-box-archive chat-archive-btn";
//     btn.dataset.tooltip = "";
//     btn.setAttribute("aria-label", "Archive old messages");
//     btn.addEventListener("click", archiveMessages);
//     const trashBtn = controlButtons.querySelector('[data-action="flush"]');
//     if (trashBtn) controlButtons.insertBefore(btn, trashBtn);
//     else controlButtons.append(btn);
// }

// function onRenderChatLog(chatLog, html) {
//     if (!game.user.isGM) return;
//     const root = html instanceof HTMLElement ? html : html[0];
//     injectArchiveButton(root?.querySelector("#chat-controls .control-buttons"));
// }

export function registerArchiveHooks() {
    if (!isEnabled(SETTING_NAMES.ENABLE_CHAT_ARCHIVE)) return;
    // Hooks.on("renderChatLog", onRenderChatLog);
    Hooks.on("createChatMessage", () => autoArchiveMessages());
    // if (game.user.isGM) {
    //     injectArchiveButton(document.querySelector("#chat-controls .control-buttons"));
    // }
    // Handle messages already in chat at load time — createChatMessage won't fire for these
    autoArchiveMessages();
}
