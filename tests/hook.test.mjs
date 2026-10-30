import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { d20, makeRoll, heroPoints, snapshot } from "./helpers/fake-roll.mjs";

// Fake Foundry Hooks global; module.js registers via Hooks.once("ready") then Hooks.on("pf2e.reroll").
const registered = { once: {}, on: {} };
globalThis.Hooks = {
  once: (name, cb) => { registered.once[name] = cb; },
  on: (name, cb) => { registered.on[name] = cb; },
};
await import(new URL("../scripts/module.js", import.meta.url).href);
registered.once.ready();
const handler = registered.on["pf2e.reroll"];

test("registers a pf2e.reroll handler on ready", () => {
  assert.equal(typeof handler, "function");
});
test("hero-points slug floors newRoll (AC-1)", () => {
  const oldRoll = makeRoll([d20(2), "+", 5]);
  const newRoll = makeRoll([d20(4), "+", 5]);
  handler(oldRoll, newRoll, heroPoints());
  assert.equal(newRoll._total, 15);
  assert.equal(newRoll.dice[0].results[0].result, 10);
});
test("oldRoll is never mutated (AC-9)", () => {
  const oldRoll = makeRoll([d20(2), "-", 5]);
  const before = snapshot(oldRoll);
  handler(oldRoll, makeRoll([d20(4), "-", 5]), heroPoints());
  assert.equal(snapshot(oldRoll), before);
});
test("other resource slug does not floor newRoll (AC-7)", () => {
  const newRoll = makeRoll([d20(4), "+", 5]);
  const before = snapshot(newRoll);
  handler(makeRoll([d20(2)]), newRoll, { slug: "focus-points" });
  assert.equal(snapshot(newRoll), before);
});
test("exception inside floor is caught, logged, and roll left unchanged", () => {
  const err = mock.method(console, "error", () => {});
  try {
    const newRoll = makeRoll([d20(4), "+", 5]);
    const before = snapshot(newRoll);
    Object.defineProperty(newRoll, "dice", { get() { throw new Error("boom"); } });
    assert.doesNotThrow(() => handler(makeRoll([d20(2)]), newRoll, heroPoints()));
    assert.equal(snapshot(newRoll), before);
    assert.equal(err.mock.callCount(), 1);
  } finally { err.mock.restore(); }
});
test("unsupported formula `1d20 * 2` via hook: error logged, roll left unchanged (fail-closed)", () => {
  const err = mock.method(console, "error", () => {});
  try {
    const newRoll = makeRoll([d20(4), "*", 2]);
    const before = snapshot(newRoll);
    assert.doesNotThrow(() => handler(makeRoll([d20(2)]), newRoll, heroPoints()));
    assert.equal(snapshot(newRoll), before);
    assert.equal(err.mock.callCount(), 1);
  } finally { err.mock.restore(); }
});
