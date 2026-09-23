import { MODULE_NAME } from "../../shared/const.js";

/**
 * Utility class to handle all rendering from provided fields into HTML data.
 */
export class RenderUtility {
    /**
     * Renders a module template from the templates folder.
     * @param {TEMPLATE} template The requested template to render.
     * @param {Object} data Field metadata for rendering.
     * @returns {Promise<String>} The rendered html data for the field.
     */
    static render(template, data) {
        return foundry.applications.handlebars.renderTemplate(`modules/${MODULE_NAME}/templates/${template}`, data);
    }
}
