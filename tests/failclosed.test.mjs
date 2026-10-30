import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
import {
  d20, makeRoll, makeRollNested, cachedDie, parenthetical, pool, snapshot,
} from "./helpers/fake-roll.mjs";

const target = process.env.REROLL_MODULE
  ? pathToFileURL(path.resolve(process.env.REROLL_MODULE)).href
  : new URL("../scripts/reroll.js", import.meta.url).href;
const { applyHeroPointFloor } = await import(target);

// ---- 1. Fail closed: throw AND leave roll unmodified ----
const unsafe = [
  ["multiplication `1d20 * 2`", () => makeRoll([d20(6), "*", 2])],
  ["parenthesized `(1d20 + 2) * 2`", () => makeRollNested([parenthetical([d20(6), "+", 2], 8), "*", 2])],
  ["division `1d20 / 2`", () => makeRoll([d20(6), "/", 2])],
  ["unknown operator after an otherwise floorable die", () => makeRoll([d20(3), "+", 4, "%", 3])],
  ["ParentheticalTerm operand `(1d20 + 2)` alone", () => makeRollNested([parenthetical([d20(6), "+", 2], 8)])],
  ["PoolTerm operand `{1d20, 1d20}`", () => makeRollNested([pool([makeRoll([d20(6)]), makeRoll([d20(4)])], 10)])],
  ["term with non-numeric total (string)", () => makeRoll([d20(6), "+", { total: "abc" }])],
  ["term with undefined total", () => makeRoll([d20(6), "+", { total: undefined }])],
  ["term with NaN total", () => makeRoll([d20(6), "+", { total: NaN }])],
];
for (const [name, build] of unsafe) {
  test(`fail-closed throws on ${name}`, () => {
    const roll = build();
    assert.throws(() => applyHeroPointFloor(roll));
  });
  test(`fail-closed leaves roll unmodified on ${name}`, () => {
    const roll = build();
    const before = snapshot(roll);
    try { applyHeroPointFloor(roll); } catch { /* expected */ }
    assert.equal(snapshot(roll), before);
  });
}

// ---- 2. Unary minus / operator then negative number ----
test("leading unary minus `-2 + 1d20`, 6 raised to 10 gives 8", () => {
  const roll = makeRoll(["-", 2, "+", d20(6)]);
  applyHeroPointFloor(roll);
  assert.equal(roll._total, 8);
});
test("leading unary minus `-2 + 1d20`, 15 stays 15 gives 13", () => {
  const roll = makeRoll(["-", 2, "+", d20(15)]);
  applyHeroPointFloor(roll);
  assert.equal(roll._total, 13);
});
test("`1d20 + -2` (operator then negative NumericTerm), 6 raised to 10 gives 8", () => {
  const roll = makeRoll([d20(6), "+", -2]);
  applyHeroPointFloor(roll);
  assert.equal(roll._total, 8);
});
test("`1d20 - -2` (minus then negative NumericTerm), 6 raised to 10 gives 12", () => {
  const roll = makeRoll([d20(6), "-", -2]);
  applyHeroPointFloor(roll);
  assert.equal(roll._total, 12);
});

// ---- 3. Inactive dice and cached term totals ----
test("floored d20 updates the term's cached total (6 -> 10)", () => {
  const roll = makeRoll([cachedDie(20, [6]), "+", 3]);
  applyHeroPointFloor(roll);
  assert.equal(roll.dice[0].total, 10);
  assert.equal(roll._total, 13);
});
test("inactive die below floor is not floored (kh2 of 2d20: [15 active, 4 inactive])", () => {
  const roll = makeRoll([cachedDie(20, [15, 4], [true, false]), "+", 1]);
  applyHeroPointFloor(roll);
  assert.deepEqual(roll.dice[0].results.map((r) => r.result), [15, 4]);
});
test("inactive die is not counted in term total or roll total", () => {
  const roll = makeRoll([cachedDie(20, [15, 4], [true, false]), "+", 1]);
  applyHeroPointFloor(roll);
  assert.equal(roll.dice[0].total, 15);
  assert.equal(roll._total, 16);
});
test("active die floored while inactive higher die ignored (kl: [6 active, 18 inactive])", () => {
  const roll = makeRoll([cachedDie(20, [6, 18], [true, false]), "+", 2]);
  applyHeroPointFloor(roll);
  assert.deepEqual(roll.dice[0].results.map((r) => r.result), [10, 18]);
  assert.equal(roll.dice[0].total, 10);
  assert.equal(roll._total, 12);
});
test("inactive die stays inactive after flooring", () => {
  const roll = makeRoll([cachedDie(20, [6, 3], [true, false])]);
  applyHeroPointFloor(roll);
  assert.deepEqual(roll.dice[0].results.map((r) => r.active), [true, false]);
});
