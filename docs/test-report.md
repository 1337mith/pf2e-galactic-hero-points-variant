# Test report

## B-1 / BUG-1 red phase (2026-10-30)
Run: `node --test tests/` (Node 20+; tests are `.mjs`, no package.json needed).
- Against scripts/reroll.js: cannot run yet, module does not exist (ERR_MODULE_NOT_FOUND). Developer must create it.
- Against the original clamp logic (main:scripts/module.js wrapped verbatim as the contract, via `REROLL_MODULE=<adapter>`): 19 tests, 12 pass, 7 fail, all 7 for the minus-operator bug (actual 23/15/15/16/23 vs expected 13/5/5/12/19).

| AC | Status |
|----|--------|
| AC-1, AC-2 (floor, positive/zero modifier) | covered, pass on original logic |
| AC-3 (all values 1..20) | FAIL (negative modifier) |
| AC-4 (modifiers preserved, incl. negative) | FAIL (BUG-1) |
| AC-5 non-d20 untouched | covered, pass |
| AC-7 non-hero-points | covered via isHeroPointReroll only; hook wiring not tested |
| AC-8 idempotence | FAIL (BUG-1) |
| AC-13 robustness | partial (empty roll, unevaluated die) |
| AC-6 (kh/kl), AC-12 (Misfortune), AC-10/11 (degree, rendering) | BLOCKED, unverified, no tests written |
| AC-9 (oldRoll not mutated) | not yet tested (add once module exists) |
