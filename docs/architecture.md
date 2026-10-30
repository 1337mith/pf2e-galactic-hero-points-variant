# Architecture notes and feasibility (workflow step 2)

Status: DRAFT for product owner go/no-go. Author: architect. Scope: issue #3, PR #4, test harness, release workflow.

## 1. Current system

- `scripts/module.js` (39 lines): on `ready`, registers `Hooks.on("pf2e.reroll", (oldRoll, newRoll, resource) => ...)`. If `resource?.slug === "hero-points"`, it sets every d20 `result.result < 10` to 10, then overwrites `newRoll._total` twice (dice sum, then sum of `term.total` over `newRoll.terms`).
- `module.json`: v1.0.3, compat min 13 / verified 13.348, manifest and download URLs hardcoded to `v1.0.3`. Loads `scripts/module.js` as an ES module. No build step, no dependencies.
- Release: tag `v*.*.*` -> zip -> GitHub release. No tests exist.

## 2. Reroll logic and issue #3: what we know and do not know

Evidence gathered (PF2e `master`, `src/module/system/check/check.ts`, via raw GitHub fetch; NOT the 7.7.2 tag):
- `CheckPF2e.rerollFromMessage` clones the old roll, calls `Hooks.callAll("pf2e.preReroll", oldCopy, unevaluatedNewRoll, heroPoint, keep)`, evaluates, then `Hooks.callAll("pf2e.reroll", oldCopy, newRoll, heroPoint, keep)`. So the hook fires AFTER evaluation and the new roll is evaluated.
- On master the third argument is a boolean `heroPoint`, not a resource object. The module reads `resource?.slug`. With a boolean that is `undefined`, so the patch would never run on master. The module was written against some version where arg 3 was a resource (`slug: "hero-points"`). We have NOT verified the 7.7.2 signature. This is the first thing to check (read the 7.7.2 tag source or log `arguments` in a live world).
- After the hook, PF2e compares `oldRoll.total` vs `newRoll.total` for keep-higher/lower and posts `keptRoll`, so whatever the hook does to `_total` affects what is shown.

Code-level defects visible without Foundry (these are facts about the code, not proven causes of #3):
1. `DiceTerm.total` / `RollTerm.total` is, to our understanding of Foundry's API, a stored `_total` set at evaluation, not recomputed from `results`. If so, mutating `result.result` does not change `term.total`, and the second `_total` assignment discards the first. Needs verification against Foundry v13 `client/dice/terms/`.
2. The term-sum ignores `OperatorTerm`s (no numeric `total`), so any subtraction (`1d20 - 2`) would be summed as addition.
3. The first `_total` computation (sum of dice only) drops all modifiers; it is only masked because the second overwrites it.
4. Mutating `results` without touching `active`/rendered `formula` leaves the chat card inconsistent with `total`.
5. Hook gets `Roll.total` getter which in Foundry returns `_total` only if evaluated; fine here, but `_total` is a private field and may change across v13/v14.
6. Unconditional `console.log` noise on every reroll, including non-hero-point ones.
7. Rule check needed: SF2e Galactic Hero Points say the d20 is treated as at least 10 ("if the result is lower than 10, use 10"). Product owner should confirm intended semantics (floor on the natural die, then add modifiers; and interaction with fortune/misfortune and keep-higher).

Hypotheses for "every reroll is 10" (none proven; do not claim a root cause yet):
- H1: Signature/arg mismatch in the reporter's PF2e (7.7.2 or later) such that the guard misfires. Discriminator: log `arguments` in the hook on a hero-point reroll and on a non-hero-point reroll. NOTE: on master the guard would never fire, which predicts "no clamping", the opposite of the symptom, so H1 alone does not fit unless 7.7.2 differs.
- H2: `newRoll.dice` or the `.results` array is shared/aliased with the old roll or other state, so changes propagate. Discriminator: compare `oldRoll`/`newRoll` results ids in a live world.
- H3: PF2e wraps the d20 in a different term shape (e.g. `1d20` inside a Grouped/Parenthetical/Pool term, or `dice` returning terms whose `faces` is 20 but results are pre-modified), making the recomputed `_total` wrong. Discriminator: `console.dir(newRoll.terms)` and `newRoll.formula`.
- H4: Display vs total divergence: the card renders from `terms` (unmodified results, or modified results) while `total` comes from `_total`, so the user sees "10" from one source. Discriminator: screenshot of card with formula and tooltip vs the total; compare `newRoll.total` to the dice results.
- H5: Foundry v13/v14 Roll API change (private `_total`, `evaluate` semantics, `DiceTerm.results` shape) so the manual `_total` rewrite behaves differently. Discriminator: reproduce on a clean v13 world and a v14 world with only PF2e and this module, with logging.
- H6: Another module or PF2e hero-point settings (e.g. "pf2e reroll settings" style modules) alter keep behavior. Discriminator: reproduce with only this module.

Note the reporter's recording is not available to us; the first required step is a reproduction with logging (a spike, see section 6).

## 3. Testability options

Option A (recommended): extract a pure function, thin hook shell.
- New file `scripts/reroll.js` exporting e.g. `applyHeroPointFloor(roll, floor = 10)` (mutates/returns roll-like) and `isHeroPointReroll(arg)` (handles both boolean and `{slug}` shapes pending spike). `scripts/module.js` imports it and only does `Hooks.once`/`Hooks.on`. Relative ES import works in Foundry with no build step. Add it under `esmodules` only if needed (an imported file need not be listed).
- Cost: S. Risk: low. Also lets us remove the `_total` hack once the correct approach is known (Option C below).

Option B: test the hook by faking `Hooks` and `globalThis` and importing `module.js` as-is. Cheap, but couples tests to the shell and still needs fake Rolls. Useful as one wiring test on top of A.

Option C (fix direction, depends on spike): avoid touching `_total` by modifying the die result, then rebuilding via `Roll.fromTerms`/`newRoll.resetFormula()` or constructing a new evaluated roll and re-assigning, or by setting `term.results[i].result` and `term._total`, with `roll._total = roll._evaluateTotal()`. Foundry's `Roll#_evaluateTotal` exists as a protected method that walks terms and handles operators; calling it is more faithful than a hand-rolled sum. Needs verification in v13 and v14 source.

Test runner: `node:test` + `node:assert/strict`. Zero dependencies, runs raw ESM unchanged, no transform, matches the no-build constraint. vitest/jest add a dev-dependency tree and config for no gain here. `package.json` needed only for `"type": "module"` and `"scripts": {"test": "node --test tests/"}`; it is dev-only and excluded from the zip.

Fake fidelity needed: a roll-like object `{ dice: [{faces, results:[{result, active}], total}], terms: [...], _total, total }`, plus operator/numeric terms. Keep the fake minimal and written from Foundry's documented shapes; do not reimplement Roll. Fidelity limits: fakes encode our assumptions, so they can pass while real Foundry fails (this is exactly the risk in issue #3).

Cannot be covered outside Foundry:
- Hook timing and PF2e's actual argument list/version drift.
- Real `Roll.total`, `DiceTerm.total`, `_evaluateTotal` semantics in v13/v14.
- Chat card rendering and keep-higher/lower interaction.
- SF2e system behaviour (PR #4).

Cover these with (1) a short manual smoke checklist `docs/smoke-checklist.md` run on Foundry 13 and 14 with PF2e (and SF2e if claimed), checking: hero-point reroll with natural 1-9 yields d20 = 10 and total = 10 + modifiers (including a negative modifier); natural 11+ unchanged; non-hero-point reroll unchanged; keep-higher/lower; chat card formula vs total consistent; console shows hook args; and (2) an optional single-purpose "contract" log in the spike. Evaluate Quench (in-Foundry test module) later; it is out of scope now (extra dependency, setup cost).

## 4. Release workflow review (ranked)

Problems in `.github/workflows/release.yml`:
1. (High) `zip -r pf2e-...-${VERSION}.zip .` zips the whole checkout including `.git`, `.github`, and any future `tests/`, `package.json`, `node_modules`, and also places the output zip inside the tree it is zipping. Files are at zip root, which is what Foundry expects for a module zip (module.json at root), so layout is OK; contents are not. Fix: zip an explicit allowlist: `zip -r out.zip module.json scripts/ README.md LICENSE* [styles/ lang/ if added]`.
2. (High) No check that tag == `module.json` version, and manifest/download URLs match the tag. Version is bumped by hand (history shows "forgot to increment version" commits). Fix: a step that fails if `jq -r .version module.json != $VERSION` or the `manifest`/`download` URLs do not contain `v$VERSION`. Better later: workflow rewrites version/manifest/download from the tag before zipping (common Foundry pattern), so manual edits go away. That changes the committed-manifest contract (the `manifest` URL points to the tag's raw module.json), so it needs care: the in-tag module.json must already contain the right values, therefore prefer the validation step first.
3. (High) No test gate. Add a `test` job (`node --test`) and `needs: test` on the release job. Also run on pull_request.
4. (Medium) `actions/create-release@v1` is archived/deprecated; use `softprops/action-gh-release@v2` or `gh release create`, which also attaches assets. Currently the zip is only uploaded as a workflow artifact and is NOT attached to the release, so the `download` URL in module.json (`releases/download/v1.0.3/...zip`) would 404 unless the asset is attached. Verify on the existing v1.0.3 release; this may be a live install defect.
5. (Medium) Release should also attach `module.json` (Foundry's recommended "latest" manifest URL pattern: `.../releases/latest/download/module.json`).
6. (Low) `actions/checkout@v3` -> `@v4`/`@v5`; pin by major. `VERSION` via `GITHUB_ENV` is fine; use `${GITHUB_REF_NAME#v}`. Tag pattern `v*.*.*` is OK. Minimal `permissions: contents: write` is good; scope it to the release job only.

## 5. PR #4 (sf2e relationship)

Adding `sf2e` to `relationships.systems` is declarative only; Foundry will then permit the module in SF2e worlds. We have not tested that the `pf2e.reroll` hook (or the same signature) exists in the SF2e system, and the module is named "Galactic Hero Points Variant for PF2e" and targets PF2e. Recommend: accept only after the smoke checklist passes on SF2e, or accept as unverified and note it in the README. Also `compatibility.verified` is 13.348 while a user runs v14; raising `verified`/`maximum` should follow the smoke test, not precede it.

## 6. Feasibility verdict

Feasible. Low risk for harness and release hardening (S each). Bug fix: M, with an uncertainty tail until the root cause is reproduced.

Recommendation: GO, in this order:
1. Spike (timeboxed, ~2h, needs Foundry 13 + PF2e 7.7.2, and ideally 14): reproduce #3 with logging of hook arguments, `newRoll.terms`, `formula`, `_total`, and `total` before/after. Also read PF2e 7.7.2 `check.ts` and Foundry v13 `DiceTerm`/`Roll#_evaluateTotal`.
2. Iteration 1: pipeline (package.json, `node --test`, CI test job, allowlist zip, version validation) so every story is releasable. Extract pure function; tester writes failing tests (including negative modifier and natural>=10 cases); developer fixes.
3. Release-hardening and PR #4 as separate stories.

Risks: fakes diverge from real Foundry (mitigated by smoke checklist); PF2e hook signature drift (mitigate by tolerant arg detection plus a log of unknown shapes); manual-only v13/v14 verification cost; possible broken download asset on v1.0.3.

## 7. NFRs (acceptance criteria input for the systems analyst)

- Compatibility: Foundry 13 minimum; works on 14; PF2e current and 7.7.2; no use of deprecated/private API without a guard and a test.
- No build step, no runtime dependencies; shipped files are raw ESM. Zip contains only module.json, scripts/, README, license (and assets/lang if added). tests/, package.json, node_modules, .git, .github excluded; verified by a CI check listing zip contents.
- Reliability: a failing hook must never break PF2e rerolls (wrap in try/catch, log a warning once, leave roll unmodified).
- Correctness: d20 floor of 10 applies only to hero-point rerolls; modifiers (including negative) preserved; displayed formula/dice agree with total; keep-higher/lower still correct.
- Observability: no console spam in normal play; debug logging behind a setting or `CONFIG.debug`.
- Security: no network calls, no `eval`, no HTML injection; GitHub token scoped to contents:write on the release job only; actions pinned to maintained major versions.
- Performance: negligible (per-reroll, O(terms)).
- Release: tag, `module.json` version, manifest, and download URLs must agree or the release fails; tests must pass before release.

## 8. WSJF inputs (architect view; rank belongs to the product owner)

| Item | Risk reduction | Opportunity enablement | Note |
|---|---|---|---|
| Spike to reproduce #3 | High | Medium | unblocks the fix |
| Test pipeline + pure-function extraction | High | High | enabler for all stories |
| Fix #3 | High (core feature broken) | Medium | |
| Release tag/version validation + allowlist zip | High | Medium | stops repeated version mistakes |
| Verify/attach release asset | High if v1.0.3 download is broken | Medium | check immediately |
| PR #4 sf2e | Low | Medium | gate on smoke test |
| Action upgrades | Low | Low | bundle with release work |
