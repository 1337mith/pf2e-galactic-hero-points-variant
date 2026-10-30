# Bug log

## BUG-1 (story B-1 / issue #3): negative modifier is added, not subtracted
- Story: B-1 (GitHub issue #3), affects S-1 AC-4 and AC-3.
- Severity: major (wrong roll totals on any check with a negative modifier or subtraction; blocks story acceptance).
- Status: OPEN (failing tests written, awaiting developer fix). Note: the original "every reroll becomes 10" symptom was NOT reproduced by the spike; the confirmed defect is below.
- Steps to reproduce (PO spike, PF2e 8.6.1, Foundry v14.369): hero-point reroll of a check with formula `1d20 - 5`. Terms are [Die d20, OperatorTerm "-" (total is the string " - "), NumericTerm 5]. The clamp recomputes `_total` by summing every numeric `term.total`, so the operator is ignored and the modifier is added.
- Expected: new d20 18 -> 13; 6 -> clamped 10 -> 5; 5 -> clamped 10 -> 5.
- Actual: 23; 15; 15. Even an unclamped die gets a wrong total because the recompute always runs. Positive modifiers (`1d20 + 22`) are correct.
- Tests: tests/reroll.test.mjs (cases tagged "B-1", plus the AC-3 sweep and AC-8 idempotence, which fail for the same reason).
