/**
 * Utility class for handing configuration dialogs.
 */
export class DialogUtility {
    static getConfirmDialog(title, options = {}) {
        const { width, top, left } = options;
        return foundry.applications.api.DialogV2.confirm({
            window: { title },
            content: "",
            rejectClose: false,
            position: { width, top, left },
        });
    }

    /**
     * Ask the user to pick one of several buttons.
     * @param {string} title
     * @param {string} content HTML shown above the buttons.
     * @param {{action: string, label: string}[]} choices
     * @returns {Promise<string|null>} The chosen button's action, or null when cancelled or closed.
     */
    static async getChoiceDialog(title, content, choices) {
        const choice = await foundry.applications.api.DialogV2.wait({
            window: { title },
            content,
            buttons: [...choices, { action: "cancel", label: "Cancel" }],
            rejectClose: false,
        });
        return choice && choice !== "cancel" ? choice : null;
    }
}
