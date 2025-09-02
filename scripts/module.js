Hooks.once("ready", () => {
  const CheckPF2e = game.pf2e?.Check;
  if (!CheckPF2e?.rerollFromMessage) return;

  const original = CheckPF2e.rerollFromMessage;
  CheckPF2e.rerollFromMessage = async function (message, options = {}) {
    const patchDice = (oldRoll, newRoll, resource, keep) => {
      console.log("Resource slug:", resource?.slug);
      console.log("Old roll total:", oldRoll._total);
      console.log("New roll total (before patch):", newRoll._total);

      for (const die of newRoll.dice) {
        console.log(`Die with faces ${die.faces}:`, die.results.map(r => r.result));
      }

      if (resource?.slug === "hero-points") {
        for (const die of newRoll.dice) {
          if (die.faces === 20) {
            for (const result of die.results) {
              if (result.result < 10) result.result = 10;
            }
          }
        }
      }

      console.log("New roll dice results (after patch):");
      for (const die of newRoll.dice) {
        console.log(`Die with faces ${die.faces}:`, die.results.map(r => r.result));
      }

      console.log("New roll total (after patch):", newRoll._total);

      console.log("Roll terms:");
      for (const term of newRoll.terms) {
        console.log(term);
      }
    };

    // Hook into reroll event to apply patchDice when reroll happens
    Hooks.once("pf2e.reroll", patchDice);

    // Call original rerollFromMessage so reroll happens and triggers the hook
    return original.call(this, message, options);
  };
});