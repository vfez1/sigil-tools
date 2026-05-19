Hooks.once("ready", async () => {
    const LOG_PREFIX = "[Sigil Tools | Dev Scene Loader]";
    const DEV_USER_NAME = "Dev";
    const TARGET_SCENE_NAME = "Iedcaru";

    if (game.user?.name !== DEV_USER_NAME) return;

    const targetScene = game.scenes?.find(scene => scene.name === TARGET_SCENE_NAME);

    if (!targetScene) {
        console.warn(`${LOG_PREFIX} Scene "${TARGET_SCENE_NAME}" was not found.`);
        return;
    }

    if (canvas.scene?.id === targetScene.id) return;

    try {
        await targetScene.view();
        console.log(`${LOG_PREFIX} Loaded scene "${TARGET_SCENE_NAME}" for user "${DEV_USER_NAME}".`);
    } catch (err) {
        console.error(`${LOG_PREFIX} Failed to load scene "${TARGET_SCENE_NAME}".`, err);
    }
});
