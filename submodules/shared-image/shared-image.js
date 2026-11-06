// Shared images: the chat cards the Art Finder's *Show to players* posts (cityofdoors.net/codex/art-finder/,
// written by Garuk from cityofdoors's artFinder.showToPlayers) beside the popup it shows everyone. A card
// holds the picture's small copy; a click on it opens the picture itself again in an image popout, so a
// player who closed the popup gets it back from the chat.

const STYLE = `
.sigil-shared-image { cursor: zoom-in; text-align: center; }
.sigil-shared-image img { display: block; width: 100%; max-height: 300px; object-fit: contain; border: none; border-radius: 4px; }
.sigil-shared-image p { margin: 4px 0 0; font-weight: bold; }
`;

export function registerSharedImageHooks() {
    const style = document.createElement("style");
    style.id = "sigil-shared-image-style";
    style.textContent = STYLE;
    document.head.append(style);
    Hooks.on("renderChatMessageHTML", (message, html) => {
        const card = html.querySelector(".sigil-shared-image[data-src]");
        if (!card) return;
        card.addEventListener("click", () => {
            const { src, title } = card.dataset;
            new foundry.applications.apps.ImagePopout({ src, showTitle: true, window: { title } }).render(true);
        });
    });
}
