// FF Bot Bridge — exposes prepared dnd5e actor data to the Discord bot via socket.
// The bot emits "module.sigil-tools" with { action: "getActor", name, requestId }
// and this handler responds with fully prepared abilities, skills, tools, and exhaustion.
Hooks.once("ready", () => {
    if (!game.user.isGM) return;

    game.socket.on("module.sigil-tools", async (payload) => {
        if (payload?.action !== "getActor") return;
        const { requestId, name } = payload;

        const actor = game.actors.getName(name);
        if (!actor) {
            game.socket.emit("module.sigil-tools", { requestId, error: "actor_not_found" });
            return;
        }

        const sys  = actor.system;
        const prof = sys.attributes?.prof ?? 2;

        // Abilities — fully prepared (Belt of Giant Strength, Active Effects all applied)
        const abilities = {};
        for (const [key, ab] of Object.entries(sys.abilities ?? {})) {
            const mod  = ab.mod ?? Math.floor(((ab.value ?? 10) - 10) / 2);
            // dnd5e 5.x: ab.save may be an object; fall back to computing mod + prof
            const save = typeof ab.save === "number" ? ab.save
                       : (ab.save?.mod ?? ab.save?.total ?? (mod + (ab.proficient === 1 ? prof : 0)));
            abilities[key] = { mod, save, proficient: ab.proficient === 1 };
        }

        // Skills — prepared totals (proficiency + ability mod + bonuses)
        const skills = {};
        for (const [abbr, sk] of Object.entries(sys.skills ?? {})) {
            skills[abbr] = {
                total:     sk.total    ?? sk.mod   ?? 0,
                profValue: sk.value    ?? 0,
                ability:   sk.ability  ?? "int",
            };
        }

        // Tools — profValue + ability so bot can apply prepared ability mod
        const tools = {};
        for (const [key, t] of Object.entries(sys.tools ?? {})) {
            tools[key] = { profValue: t.value ?? 0, ability: t.ability ?? "int" };
        }

        // Exhaustion — dnd5e 5.x stores level in status effect flags
        const exhEffect = actor.effects.find(e =>
            !e.disabled &&
            (e.statuses?.has?.("exhaustion") || [...(e.statuses ?? [])].includes("exhaustion"))
        );
        const exhaustion = exhEffect?.flags?.dnd5e?.exhaustionLevel ?? 0;

        game.socket.emit("module.sigil-tools", { requestId, prof, abilities, skills, tools, exhaustion });
    });

    console.log("[FF-Bot Bridge] Ready.");
});
