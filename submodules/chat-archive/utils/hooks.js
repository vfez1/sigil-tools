import { MODULE_NAME } from "../../shared/const.js";
import { isEnabled } from "../../shared/enable.js";
import { SETTING_NAMES } from "../../shared/settings.js";
import { ARCHIVE_SETTINGS } from "./settings.js";

async function archiveMessages() {
    const keepCount = game.settings.get(MODULE_NAME, ARCHIVE_SETTINGS.KEEP_COUNT);
    const url = game.settings.get(MODULE_NAME, ARCHIVE_SETTINGS.URL);

    const allMessages = [...game.messages].sort((a, b) => a.timestamp - b.timestamp);
    const toArchive = allMessages.slice(0, Math.max(0, allMessages.length - keepCount));

    if (!toArchive.length) {
        ui.notifications.info(`Nothing to archive — fewer than ${keepCount} messages in chat.`);
        return;
    }

    const confirmed = await Dialog.confirm({
        title: "Archive Chat Messages",
        content: `<p>Archive <strong>${toArchive.length}</strong> messages and delete them from chat?</p>
                  <p style="margin-top:6px;opacity:0.7;font-size:0.9em">The ${keepCount} most recent messages will be kept.</p>`,
    });
    if (!confirmed) return;

    ui.notifications.info(`Rendering ${toArchive.length} messages…`);
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

    let res;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
        });
    } catch (e) {
        ui.notifications.error(`Archive failed: could not reach server (${e.message}).`);
        return;
    }

    if (!res.ok) {
        ui.notifications.error(`Archive failed: server returned ${res.status}.`);
        return;
    }

    const data = await res.json();
    await ChatMessage.deleteDocuments(toArchive.map(m => m.id));
    ui.notifications.info(`Archived ${data.count} messages. View at /chatarchive`);
}

function injectArchiveButton(controlButtons) {
    if (!controlButtons) return;
    if (controlButtons.querySelector(".chat-archive-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ui-control icon fa-solid fa-box-archive chat-archive-btn";
    btn.dataset.tooltip = "";
    btn.setAttribute("aria-label", "Archive old messages");
    btn.addEventListener("click", archiveMessages);
    const trashBtn = controlButtons.querySelector('[data-action="flush"]');
    if (trashBtn) controlButtons.insertBefore(btn, trashBtn);
    else controlButtons.append(btn);
}

function onRenderChatLog(chatLog, html) {
    if (!game.user.isGM) return;
    const root = html instanceof HTMLElement ? html : html[0];
    injectArchiveButton(root?.querySelector("#chat-controls .control-buttons"));
}

export function registerArchiveHooks() {
    if (!isEnabled(SETTING_NAMES.ENABLE_CHAT_ARCHIVE)) return;
    Hooks.on("renderChatLog", onRenderChatLog);
    // Chat log is already rendered by the time ready fires — inject directly
    if (game.user.isGM) {
        injectArchiveButton(document.querySelector("#chat-controls .control-buttons"));
    }
}
