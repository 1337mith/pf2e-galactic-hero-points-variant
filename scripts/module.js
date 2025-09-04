Hooks.once("ready", () => {
  // Hook directly into the reroll event with resource info to patch hero point rerolls
  Hooks.on("pf2e.reroll", (oldRoll, newRoll, resource) => {
    console.log("pf2e.reroll event detected, resource slug:", resource?.slug);

    if (resource?.slug === "hero-points") {
      console.log("Applying hero point d20 roll patch:");

      // Patch any d20 roll results less than 10 to 10
      for (const die of newRoll.dice) {
        if (die.faces === 20) {
          for (const result of die.results) {
            if (result.result < 10) {
              console.log(`Adjusting d20 roll from ${result.result} to 10`);
              result.result = 10;
            }
          }
        }
      }

      // Recalculate dice total from individual dice results
      newRoll._total = newRoll.dice.reduce((sum, die) => {
        return sum + die.results.reduce((rSum, res) => rSum + res.result, 0);
      }, 0);

      // Recalculate overall total including modifiers (terms)
      if (newRoll.terms) {
        newRoll._total = newRoll.terms.reduce((sum, term) => {
          if (typeof term.total === "number") return sum + term.total;
          return sum;
        }, 0);
      }

      console.log("New dice results after patch:", newRoll.dice.map(die => die.results.map(r => r.result)));
      console.log("New roll total after patch:", newRoll._total);
    } else {
      console.log("Reroll detected but not triggered by hero points, no patch applied.");
    }
  });
});