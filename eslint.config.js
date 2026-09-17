import globals from "globals";

const foundryGlobals = {
    // Core
    game: "readonly",
    Hooks: "readonly",
    CONFIG: "readonly",
    CONST: "readonly",
    foundry: "readonly",
    canvas: "readonly",
    ui: "readonly",
    socket: "readonly",
    // Document classes
    Actor: "readonly",
    ActiveEffect: "readonly",
    ChatMessage: "readonly",
    Combat: "readonly",
    Combatant: "readonly",
    Item: "readonly",
    JournalEntry: "readonly",
    Macro: "readonly",
    Region: "readonly",
    Scene: "readonly",
    Token: "readonly",
    TokenDocument: "readonly",
    User: "readonly",
    // Applications
    Dialog: "readonly",
    FormApplication: "readonly",
    Application: "readonly",
    Roll: "readonly",
    // jQuery
    $: "readonly",
    jQuery: "readonly",
    // Foundry utilities
    fromUuid: "readonly",
    fromUuidSync: "readonly",
    CanvasAnimation: "readonly",
    Color: "readonly",
    FormDataExtended: "readonly",
    Ray: "readonly",
    PIXI: "readonly",
    renderTemplate: "readonly",
    // Third-party / module globals
    effectmacro: "readonly",
    Handlebars: "readonly",
    libWrapper: "readonly",
    socketlib: "readonly",
    dnd5e: "readonly",
};

export default [
    {
        ignores: [
            "_temp/**",
            "node_modules/**",
            // Vendored third-party bundle, not edited by hand.
            "submodules/combat-tracker-dock/scripts/sortable.js",
        ],
    },
    {
        files: ["**/*.js", "**/*.mjs"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...foundryGlobals,
            },
        },
        rules: {
            "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
            "no-undef": "warn",
            "no-unreachable": "warn",
            "no-unused-expressions": "warn",
            "no-duplicate-imports": "warn",
        },
    },
];
