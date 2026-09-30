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

        const count = await _archiveAndDelete(toArchive);
        console.log(`[chat-archive] Auto-archived ${count} messages.`);
    } catch (e) {
        console.error(`[chat-archive] Auto-archive failed: ${e.message}`);
    } finally {
        _archiveInProgress = false;
    }
}

/**
 * GM chat-controls button: archive every message currently in chat (ignoring the keep-recent
 * count) after a confirmation, then clear them from the log.
 */
async function archiveAllMessages() {
    if (!game.user.isGM) return;
    if (_archiveInProgress) {
        ui.notifications.warn("Chat archive is already running, try again in a moment.");
        return;
    }
    const toArchive = [...game.messages].sort((a, b) => a.timestamp - b.timestamp);
    if (!toArchive.length) {
        ui.notifications.info("No chat messages to archive.");
        return;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Archive Chat", icon: "fa-solid fa-box-archive" },
        content: `<p>Send all ${toArchive.length} chat messages to the archive and remove them from the chat log?</p>`,
        rejectClose: false,
    });
    if (!confirmed || _archiveInProgress) return;

    _archiveInProgress = true;
    try {
        const count = await _archiveAndDelete(toArchive);
        ui.notifications.info(`Archived ${count} chat messages.`);
    } catch (e) {
        console.error(`[chat-archive] Manual archive failed: ${e.message}`);
        ui.notifications.error(`Chat archive failed: ${e.message}. Nothing was removed from chat.`);
    } finally {
        _archiveInProgress = false;
    }
}

/**
 * POST the messages' rendered HTML to the archive server and, only once it confirms, delete them
 * from chat. Throws (having deleted nothing) if the server can't be reached or returns an error.
 * @param {ChatMessage[]} toArchive  Oldest first.
 * @returns {Promise<number>}  How many messages the server reports archiving.
 */
async function _archiveAndDelete(toArchive) {
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
        throw new Error(`could not reach server (${e.message})`);
    }
    if (!res.ok) throw new Error(`server error ${res.status}`);

    const data = await res.json().catch(() => ({ count: toArchive.length }));
    const idsToDelete = toArchive.map(m => m.id).filter(id => game.messages.has(id));
    await ChatMessage.deleteDocuments(idsToDelete);
    return data.count ?? toArchive.length;
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

/**
 * Add the archive button to the GM's chat control buttons, left of core's Clear Chat (trash).
 * #chat-controls is a single element core moves between the sidebar and the notifications area,
 * so one injection persists; the class check keeps repeat calls from adding a second button.
 * @param {HTMLElement|null} controlButtons  The ".control-buttons" element.
 */
function injectArchiveButton(controlButtons) {
    if (!controlButtons) return;
    if (controlButtons.querySelector(".chat-archive-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ui-control icon fa-solid fa-box-archive chat-archive-btn";
    btn.dataset.tooltip = "";
    btn.setAttribute("aria-label", "Archive all chat messages");
    btn.addEventListener("click", archiveAllMessages);
    const trashBtn = controlButtons.querySelector('[data-action="flush"]');
    if (trashBtn) controlButtons.insertBefore(btn, trashBtn);
    else controlButtons.append(btn);
}

function onRenderChatInput(app, elements) {
    if (!game.user.isGM) return;
    injectArchiveButton(elements["#chat-controls"]?.querySelector(".control-buttons"));
}

export function registerArchiveHooks() {
    if (!isEnabled(SETTING_NAMES.ENABLE_CHAT_ARCHIVE)) return;
    Hooks.on("renderChatInput", onRenderChatInput);
    Hooks.on("createChatMessage", () => autoArchiveMessages());
    // The chat input has usually rendered before "ready", so inject into it directly too.
    if (game.user.isGM) {
        injectArchiveButton(document.querySelector("#chat-controls .control-buttons"));
    }
    // Handle messages already in chat at load time — createChatMessage won't fire for these
    autoArchiveMessages();
}
