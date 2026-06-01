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
}
