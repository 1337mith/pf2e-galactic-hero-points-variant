import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { d20, die, makeRoll, heroPoints } from "./helpers/fake-roll.mjs";

// Contract (docs/adr/0001, docs/architecture.md Option A): scripts/reroll.js exports
//   applyHeroPointFloor(roll, floor = 10)  -> mutates roll dice results and roll._total, returns roll
//   isHeroPointReroll(resource)            -> true only when resource?.slug === "hero-points"
// REROLL_MODULE may override the module path (used to run the suite against an adapter).
const target = process.env.REROLL_MODULE
  ? pathToFileURL(path.resolve(process.env.REROLL_MODULE)).href
  : new URL("../scripts/reroll.js", import.meta.url).href;
const { applyHeroPointFloor, isHeroPointReroll } = await import(target);

const dieValues = (roll) => roll.dice.map((d) => d.results.map((r) => r.result));

// [name, spec, expected die value, expected total]  (AC-1..AC-4, B-1 / issue #3)
const cases = [
  ["bare 1d20, 7 raised to 10", () => makeRoll([d20(7)]), 10, 10],
  ["bare 1d20, 19 stays 19", () => makeRoll([d20(19)]), 19, 19],
  ["bare 1d20, 10 stays 10", () => makeRoll([d20(10)]), 10, 10],
  ["1d20 + 22, 8 raised to 10 gives 32", () => makeRoll([d20(8), "+", 22]), 10, 32],
  ["1d20 + 22, 6 raised to 10 gives 32", () => makeRoll([d20(6), "+", 22]), 10, 32],
  ["1d20 + 3, 15 stays 15 gives 18", () => makeRoll([d20(15), "+", 3]), 15, 18],
  ["1d20 + 3, 2 raised to 10 gives 13", () => makeRoll([d20(2), "+", 3]), 10, 13],
  // B-1: minus operator term (total is the string " - ") must subtract.
  ["1d20 - 5, 18 unclamped gives 13 (B-1)", () => makeRoll([d20(18), "-", 5]), 18, 13],
  ["1d20 - 5, 6 raised to 10 gives 5 (B-1)", () => makeRoll([d20(6), "-", 5]), 10, 5],
  ["1d20 - 5, 5 raised to 10 gives 5 (B-1)", () => makeRoll([d20(5), "-", 5]), 10, 5],
  ["1d20 + 4 - 2, 3 raised to 10 gives 12 (B-1)", () => makeRoll([d20(3), "+", 4, "-", 2]), 10, 12],
  ["1d20 + 4 - 2, 17 stays 17 gives 19 (B-1)", () => makeRoll([d20(17), "+", 4, "-", 2]), 17, 19],
];

for (const [name, build, expDie, expTotal] of cases) {
  test(`floor: ${name}`, () => {
    const roll = build();
    applyHeroPointFloor(roll);
    assert.deepEqual(dieValues(roll), [[expDie]]);
    assert.equal(roll._total, expTotal);
  });
}

test("keeps a new result lower than the old roll (Fortune, not best-of)", () => {
  const oldRoll = makeRoll([d20(19), "+", 5]);
  const roll = makeRoll([d20(12), "+", 5]);
  applyHeroPointFloor(roll);
  assert.equal(roll._total, 17);
  assert.equal(oldRoll._total, 24);
});

test("every d20 value 1..20 yields max(R,10) with correct total (AC-3)", () => {
  for (let r = 1; r <= 20; r++) {
    const roll = makeRoll([d20(r), "-", 5]);
    applyHeroPointFloor(roll);
    assert.equal(roll.dice[0].results[0].result, Math.max(r, 10), `die for ${r}`);
    assert.equal(roll._total, Math.max(r, 10) - 5, `total for ${r}`);
  }
});

test("non-d20 dice below 10 are untouched and still counted (AC-5)", () => {
  const roll = makeRoll([d20(4), "+", die(6, 2), "+", 1]);
  applyHeroPointFloor(roll);
  assert.deepEqual(dieValues(roll), [[10], [2]]);
  assert.equal(roll._total, 13);
});

test("unevaluated d20 is not touched", () => {
  const roll = makeRoll([d20(3)]);
  roll.dice[0]._evaluated = false;
  roll.dice[0].results = [];
  assert.doesNotThrow(() => applyHeroPointFloor(roll));
  assert.deepEqual(dieValues(roll), [[]]);
});

test("is idempotent (AC-8)", () => {
  const roll = makeRoll([d20(4), "-", 5]);
  applyHeroPointFloor(roll);
  applyHeroPointFloor(roll);
  assert.equal(roll._total, 5);
  assert.deepEqual(dieValues(roll), [[10]]);
});

test("does not throw on roll with no dice or terms (AC-13)", () => {
  assert.doesNotThrow(() => applyHeroPointFloor({ dice: [], terms: [], _total: 0 }));
});

test("isHeroPointReroll accepts only the hero-points slug (AC-7)", () => {
  assert.equal(isHeroPointReroll(heroPoints()), true);
  assert.equal(isHeroPointReroll({ slug: "focus-points" }), false);
  assert.equal(isHeroPointReroll({}), false);
  assert.equal(isHeroPointReroll(undefined), false);
  assert.equal(isHeroPointReroll(null), false);
});

// BLOCKED, deliberately not tests (unverified; do not guess):
//  AC-6 kh/kl `keep` handling, AC-12 Misfortune hook behaviour, AC-10/11 rendering and degree of success.
