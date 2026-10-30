# Bug log

## BUG-1 (story B-1 / issue #3): negative modifier is added, not subtracted
- Story: B-1 (GitHub issue #3), affects S-1 AC-4 and AC-3.
- Severity: major (wrong roll totals on any check with a negative modifier or subtraction; blocks story acceptance).
- Status: CLOSED/ACCEPTED (2026-10-30, product owner). Fix at 48082a5; verified by PO manual test in Foundry 14.369 / pf2e 8.6.1 with module 1.1.0 (eea1c82), see test-report.md. Original status was OPEN. Note: the original "every reroll becomes 10" symptom was NOT reproduced by the spike; the confirmed defect is below.
- Root cause: the operator term's string total (" - ") was dropped when the clamp recomputed `_total` by summing numeric term totals, so the minus was lost and the modifier was added.
- Steps to reproduce (PO spike, PF2e 8.6.1, Foundry v14.369): hero-point reroll of a check with formula `1d20 - 5`. Terms are [Die d20, OperatorTerm "-" (total is the string " - "), NumericTerm 5]. The clamp recomputes `_total` by summing every numeric `term.total`, so the operator is ignored and the modifier is added.
- Expected: new d20 18 -> 13; 6 -> clamped 10 -> 5; 5 -> clamped 10 -> 5.
- Actual: 23; 15; 15. Even an unclamped die gets a wrong total because the recompute always runs. Positive modifiers (`1d20 + 22`) are correct.
- Tests: tests/reroll.test.mjs (cases tagged "B-1", plus the AC-3 sweep and AC-8 idempotence, which fail for the same reason).

## BUG-2 (story B-1 / S-1): v1.1.0 floor never applied in live Foundry (fail-closed guard trips on every real roll)
- Story: B-1 (fix at 48082a5, v1.1.0); affects S-1 AC-1 and AC-3 on every hero-point reroll.
- Severity: major (the hero-point floor is never applied in live Foundry; blocks acceptance of B-1).
- Status: CLOSED/ACCEPTED (2026-10-30, product owner). Found by PO manual test; fixed in eea1c82 (only nested data, not Die.roll() methods, count as nested terms); re-verified by PO manual test (9 rerolls, no console errors), see test-report.md.
- Root cause: the guard treated Foundry's prototype method `Die.roll()` as a nested term, so it threw on every real roll and the floor never applied live. Found by the PO test; the unit fakes lacked the method, so tests missed it.
- Steps to reproduce: spend a hero point to reroll any d20 check. The console shows "floor not applied: nested terms (parentheses or pools) are not supported" (thrown at scripts/reroll.js line 29, `if (term.terms || term.roll || term.rolls)`).
- Expected: d20 results below 10 raised to 10, total recomputed (`1d20 - 10`: die 6 -> 10, total 0; `1d20 + 18`: die 5 -> 10, total 28); no error.
- Actual: guard throws, roll left unchanged (fails closed), floor never applied.
- Confirmed cause detail: Foundry's DiceTerm defines `roll()` (and `reroll`, `explode`) as prototype methods, so `term.roll` is a truthy function for every plain Die. Our fakes had no such method, so tests missed it. Only an object-valued `.roll` (ParentheticalTerm inner Roll), `.terms` or `.rolls` should mark a nested term.
- Test gap: shared fakes (tests/helpers/fake-roll.mjs) now carry prototype `roll()` / `reroll()` / `explode()` by default.
- Tests: tests/failclosed.test.mjs ("BUG-2 ..."), tests/hook.test.mjs ("BUG-2 hook ...") plus every existing test that uses a die with a floorable value.

## Lesson learned
- Test fakes must mirror real Foundry term prototypes (methods such as roll/reroll/explode, string operator totals), not just data shape. BUG-2 passed 52/52 unit tests because the fake Die had no `roll()` method.
