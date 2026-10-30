import { applyHeroPointFloor, isHeroPointReroll } from "./reroll.js";

Hooks.once("ready", () => {
  Hooks.on("pf2e.reroll", (oldRoll, newRoll, resource) => {
    if (!isHeroPointReroll(resource)) return;
    try {
      applyHeroPointFloor(newRoll);
    } catch (err) {
      console.error("pf2e-galactic-hero-points-variant | floor not applied", err);
    }
  });
});
