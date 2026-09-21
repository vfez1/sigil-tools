import { MODULE_NAME } from "../../shared/const.js";
import { SETTING_NAMES, SettingsUtility } from "../../shared/settings.js";
import { ChatUtility } from "./chat.js";
import { LogUtility } from "./log.js";

export class AcknowledgedModeUtility {
    static onNewMessage(_message, _html) {}

    static applyAcknowledgedStyle(message, html) {
        if (!SettingsUtility.getSettingValue(SETTING_NAMES.ACK_MODE)) return;
        const appliedTo = message.getFlag(MODULE_NAME, "appliedTo");
        const acknowledged = message.getFlag(MODULE_NAME, "acknowledged");
        if (!appliedTo && !acknowledged) return;

        const $html = $(html);
        $html.addClass("rm-acknowledged");

        // Applied-to display — only insert once; tray marking runs every render. Skipped on cards
        // with per-target save-summary rows, where the amounts are shown inline on each row instead.
        const hasSummaryRows = $html.find(".card-summary[data-target-uuid]").length > 0;
        const messageContent = $html.find(".message-content").first();
        if (!hasSummaryRows && appliedTo && messageContent.length && !$html.find(".rm-applied-summary").length) {
            // Damage/healing cards: a "Results" block below the roll rows, one row per target in
            // the same style as the save cards' rows (name pill + applied-amount pill).
            const totalDamage = message.rolls
                ?.filter(r => r instanceof CONFIG.Dice.DamageRoll)
                ?.reduce((sum, r) => sum + (r.total ?? 0), 0) ?? 0;
            const entries = Array.isArray(appliedTo) ? appliedTo : [appliedTo];
            const rows = entries.map((e) => {
                const name = typeof e === "string" ? e : e.name;
                let cat = "";
                let text = "";
                if (typeof e === "object" && e.damage != null) {
                    if (e.isTemp) cat = "rm-ack-temp";
                    else if (e.damage > 0) cat = "rm-ack-healing";
                    else if (e.damage === 0) cat = "rm-ack-zero";
                    else if (totalDamage > 0 && Math.abs(e.damage) > totalDamage) cat = "rm-ack-vulnerable";
                    else if (totalDamage > 0 && Math.abs(e.damage) < totalDamage) cat = "rm-ack-reduced";
                    else cat = "rm-ack-full";
                    text = e.damage > 0 ? `+${e.damage}` : String(e.damage);
                }
                const row = $(
                    `<div class="card-summary rm-summary rm-applied-summary"><section class="icon-row save-summary">` +
                        `<i class="fa-fw fa-solid fa-heart-crack" aria-label="Damage applied"></i>` +
                        `<ul class="pills unlist"><li class="pill target transparent"></li></ul>` +
                        `<span class="rm-summary-damage${cat ? ` rm-ack-damage ${cat}` : ""}"></span>` +
                        `</section></div>`,
                );
                row.find(".pill").text(name);
                row.find(".rm-summary-damage").text(text);
                return row;
            });
            const label = $(`<label class="roboto-upper rm-summary-label"><i class="fa-solid fa-heart-crack" inert></i><span>Results</span></label>`);
            // Below the roll rows, above the trays (which chat.js appends after this runs for
            // usage cards, and which dnd5e has already rendered on its own damage cards).
            const tray = messageContent.children("effect-application, damage-application").first();
            if (tray.length) tray.before(label, ...rows);
            else messageContent.append(label, ...rows);
            LogUtility.log(`[RM DEBUG] applyAcknowledgedStyle: results rows messageId=${message.id} rows=${rows.length} beforeTray=${tray.length > 0}`);
        } else if (!hasSummaryRows && !appliedTo && acknowledged && !$html.find(".rm-ack-badge").length) {
            // Manual GM acknowledgement without per-target amounts keeps the simple badge.
            const badge = $(`<div class="rm-ack-badge"><div class="rm-ack-header"><i class="fas fa-check"></i><span class="rm-ack-prefix">Applied by ${acknowledged}</span></div></div>`);
            if (messageContent.length) messageContent.prepend(badge);
            else $html.prepend(badge);
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
        // Applied-damage capture runs regardless of Acknowledged Mode: the per-target amounts also
        // feed the inline entries on save-summary rows (chat.js _injectSummaryRows). The badge
        // itself stays gated on the setting in applyAcknowledgedStyle.
        document.addEventListener(
            "click",
            (e) => {
                const btn = e.target.closest(".apply-damage[data-action='applyDamage'], button.apply-damage, damage-application button.apply-button");
                if (!btn) return;
                const li = btn.closest("[data-message-id]");
                LogUtility.log(`[RM DEBUG] apply-damage click user=${game.user?.name} btnClass="${btn.className}" li=${!!li} messageId=${li?.dataset.messageId}`);
                if (!li) return;
                const message = game.messages.get(li.dataset.messageId);
                if (!message) {
                    LogUtility.log(`[RM DEBUG] apply-damage click: message ${li.dataset.messageId} not found in game.messages`);
                    return;
                }
                const hasDamage = message.rolls?.some((r) => r instanceof CONFIG.Dice.DamageRoll);
                if (!hasDamage) {
                    LogUtility.log(`[RM DEBUG] apply-damage click: message ${message.id} has no DamageRoll (rolls=${message.rolls?.length})`);
                    return;
                }
                const damageApp = btn.closest("damage-application");
                const targets = damageApp ? _readTrayTargets(damageApp) : [];
                LogUtility.log(
                    `[RM DEBUG] apply-damage click: damageApp=${!!damageApp} open=${damageApp?.open} pills=${damageApp?.querySelectorAll("target-pill").length} options=${damageApp?.querySelectorAll("datalist option").length} targets=${JSON.stringify(targets.map((t) => `${t.name}:${t.damage}`))} controlled=${JSON.stringify((canvas.tokens?.controlled ?? []).map((t) => t.name))} alreadyApplied=${btn.classList.contains("rm-already-applied")}`,
                );
                if (!targets.length) {
                    LogUtility.log(`[RM DEBUG] apply-damage click: no targets read from the tray — not recording, dnd5e's own handler proceeds.`);
                    return;
                }

                // Greyed-out button = this card's damage was already applied to every selected token.
                // Applying again is allowed, but only after an explicit confirmation. The click is
                // swallowed here (dnd5e's own handler sits on the button itself, so stopping it in the
                // capture phase is enough) and the targets, their tray options and the damages are
                // snapshotted NOW — so a "Yes" applies to the tokens that were selected when the
                // button was pressed, not whatever is selected once the dialog is answered.
                if (btn.classList.contains("rm-already-applied")) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    try {
                        const snapshot = targets.map((t) => ({ ...t, options: damageApp?.getMergedOptions?.(t.uuid) ?? {} }));
                        const damages = damageApp?.damages ?? [];
                        const names = snapshot.map((t) => t.name).join(", ");
                        LogUtility.log(`[RM DEBUG] apply-damage on already-applied card messageId=${message.id} targets=${names} damages=${damages.length} — asking for confirmation`);
                        foundry.applications.api.DialogV2.confirm({
                            window: { title: "Apply damage again?" },
                            content: `<p>Damage from this card has already been applied to <strong>${names}</strong>. Apply it again?</p>`,
                            rejectClose: false,
                        })
                            .then(async (confirmed) => {
                                LogUtility.log(`[RM DEBUG] apply-damage re-apply confirmed=${confirmed} messageId=${message.id} targets=${names}`);
                                if (!confirmed) return;
                                // Same steps as dnd5e's DamageApplicationElement#_onApplyDamage, for the snapshot.
                                for (const t of snapshot) {
                                    const token = fromUuidSync(t.uuid);
                                    LogUtility.log(`[RM DEBUG] apply-damage re-apply: ${t.name} token=${!!token} isOwner=${token?.isOwner} multiplier=${t.options?.multiplier}`);
                                    if (!token?.isOwner) continue;
                                    await token.actor?.applyDamage(damages, { ...t.options, isDelta: true, origin: message });
                                }
                                if (damageApp && game.settings.get("dnd5e", "autoCollapseChatTrays") !== "manual") damageApp.open = false;
                                _recordApplied(message, li, snapshot);
                            })
                            .catch((err) => LogUtility.logError(`[RM DEBUG] apply-damage re-apply failed: ${err?.message ?? err}`));
                    } catch (err) {
                        LogUtility.logError(`[RM DEBUG] apply-damage confirm branch threw (click was already swallowed): ${err?.message ?? err}`);
                    }
                    return;
                }
                _recordApplied(message, li, targets);
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

/**
 * Record which targets the card's damage was applied to (GM writes the flag directly, players ask
 * the GM over the socket).
 * @param {ChatMessage} message
 * @param {HTMLElement} li        The message element (for the scroll-anchor height).
 * @param {{uuid: string, name: string, damage: number|null, isTemp: boolean}[]} targets
 */
function _recordApplied(message, li, targets) {
    // Strip anything that isn't part of the stored entry (e.g. the tray options snapshot).
    const entries = targets.map(({ uuid, name, damage, isTemp }) => ({ uuid, name, damage, isTemp }));
    // Record the card's current height so processChatMessage can compensate after re-render
    ChatUtility._scrollAnchor = { messageId: message.id, cardHeight: li.offsetHeight };
    if (game.user.isGM) {
        _mergeAppliedTo(message, entries);
    } else {
        game.socket.emit(`module.${MODULE_NAME}`, {
            type: "ackAppliedTo",
            messageId: message.id,
            targets: entries,
        });
    }
}

/**
 * Read the per-target amounts currently shown in a damage-application tray.
 * dnd5e 6.0 lists targets as <target-pill> elements (grouped targets share one pill, with each
 * token as an <option> in its <datalist>); pre-6.0 used elements carrying [data-target-uuid].
 * @param {HTMLElement} damageApp
 * @returns {{uuid: string, name: string, damage: number|null, isTemp: boolean}[]}
 */
function _readTrayTargets(damageApp) {
    const parseAmount = (el) => {
        const raw = el?.textContent?.replace("−", "-").trim();
        const n = parseInt(raw);
        return el && !isNaN(n) ? n : null;
    };

    const pills = [...damageApp.querySelectorAll("target-pill")];
    if (pills.length) {
        const targets = [];
        for (const pill of pills) {
            const tempEl = pill.querySelector(".calculated.temp:not([hidden]) .value");
            const damageEl = tempEl ?? pill.querySelector(".calculated.damage:not([hidden]) .value");
            const damage = parseAmount(damageEl);
            const isTemp = !!tempEl;
            for (const option of pill.querySelectorAll("datalist option")) {
                const uuid = option.value;
                const token = fromUuidSync(uuid);
                if (token?.hidden) continue;
                targets.push({ uuid, name: token?.name ?? option.textContent.trim(), damage, isTemp });
            }
        }
        return targets;
    }

    return [...damageApp.querySelectorAll("[data-target-uuid]")].map((t) => {
        // UUID may be Scene.x.Token.y.Actor.z (synthetic token-actor).
        // Strip the embedded actor suffix to resolve the TokenDocument directly.
        const uuid = t.dataset.targetUuid;
        const tokenUuid = uuid.replace(/\.Actor\.[^.]+$/, "");
        const resolved = fromUuidSync(tokenUuid !== uuid ? tokenUuid : uuid);
        if (!resolved) return null;
        const token = resolved.documentName === "Token" ? resolved : canvas.scene?.tokens?.find((tk) => tk.actorId === resolved.id);
        if (token?.hidden) return null;
        const name = token?.name ?? resolved.name;
        const tempEl = t.querySelector(".calculated.temp:not([hidden])");
        const damageEl = tempEl ?? t.querySelector(".calculated.damage:not([hidden]), .calculated:not([hidden]), .total:not([hidden]), .adjustment:not([hidden])");
        return { uuid: token?.uuid ?? uuid, name, damage: parseAmount(damageEl), isTemp: !!tempEl };
    }).filter(Boolean);
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
    // Match by token uuid when both sides have one, else by name. Re-applying to a target
    // replaces its recorded amount rather than being ignored.
    for (const t of newTargets) {
        const idx = existingArr.findIndex((e) => (t.uuid && e.uuid ? e.uuid === t.uuid : e.name === t.name));
        if (idx === -1) existingArr.push(t);
        else existingArr[idx] = { ...existingArr[idx], ...t };
    }
    await message.setFlag(MODULE_NAME, "appliedTo", existingArr);
}
