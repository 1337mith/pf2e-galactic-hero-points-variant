# 0001 Extract reroll logic into a pure module; test with node:test

Status: Proposed (awaiting product owner go/no-go)

## Context
The reroll patch lives inside a `Hooks.on` callback in `scripts/module.js`, so it cannot be tested outside Foundry. Issue #3 reports every hero-point reroll becomes 10. The module ships raw ESM with no build step and no dependencies.

## Decision
- Move the floor logic into `scripts/reroll.js` as pure functions over roll-like objects; `scripts/module.js` stays a thin shell that registers the hook and calls them (errors caught, roll left untouched on failure).
- Use `node:test` and `node:assert/strict` (Node 20+), run via `node --test tests/`. A dev-only `package.json` provides `"type": "module"` and the test script.
- Exclude `tests/`, `package.json`, `node_modules`, `.git`, `.github` from the release zip by zipping an explicit allowlist. CI runs tests before release.
- Behaviour that needs real Foundry/PF2e (hook timing, `Roll.total` semantics, rendering) is covered by a manual smoke checklist on Foundry 13 and 14.

## Alternatives
- vitest/jest: more features and mocking, but dev-dependency tree and config with no benefit for ~40 lines of logic.
- Test `module.js` unchanged with a fake `Hooks`: possible, but couples tests to the shell; kept only as an optional wiring test.
- Quench in-Foundry tests: highest fidelity, but heavy setup; revisit if the smoke checklist proves too costly.

## Consequences
- Fast, dependency-free unit tests and a small, reviewable fix surface.
- Fakes encode our assumptions about Foundry; they can pass while real Foundry fails, so the smoke checklist and the reproduction spike are mandatory for bug #3.
- Requires Node 20+ on dev/CI machines.
- The sf2e/PF2e hook signature (boolean `heroPoint` on master vs resource object assumed by current code) must be settled in the spike before the pure function's input contract is fixed.
