Hooks.once("ready", () => {
    const CheckPF2e = game.pf2e?.Check;
    if (!CheckPF2e?.rerollFromMessage) return;

    const original = CheckPF2e.rerollFromMessage;
    CheckPF2e.rerollFromMessage = async function (message, options = {}) {
        const patchDice = (oldRoll, newRoll, resource, keep) => {
            if (resource?.slug === "hero-points") {
                for (const die of newRoll.dice) {
                    if (die.faces === 20) {
                        for (const result of die.results) {
                            if (result.result < 10) result.result = 10;
                        }
                    }
                }
                // NOT recalculating newRoll._total to preserve modifiers
            }
        };
        Hooks.once("pf2e.reroll", patchDice); // Intercept right after roll

        return original.call(this, message, options);
    };
});
