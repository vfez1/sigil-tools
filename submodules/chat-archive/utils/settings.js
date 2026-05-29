import { MODULE_NAME } from "../../shared/const.js";

export const ARCHIVE_SETTINGS = {
    URL: "chatArchiveUrl",
    KEEP_COUNT: "chatArchiveKeepCount",
};

export function registerArchiveSettings() {
    game.settings.register(MODULE_NAME, ARCHIVE_SETTINGS.URL, {
        name: "Chat Archive URL",
        hint: "Endpoint to POST archived messages to.",
        scope: "world",
        config: true,
        type: String,
        default: "https://cityofdoors.net/chatarchive/api/archive",
    });

    game.settings.register(MODULE_NAME, ARCHIVE_SETTINGS.KEEP_COUNT, {
        name: "Chat Archive: Keep Recent",
        hint: "How many recent messages to keep when archiving. Everything older is archived and deleted from chat.",
        scope: "world",
        config: true,
        type: Number,
        default: 25,
    });
}
