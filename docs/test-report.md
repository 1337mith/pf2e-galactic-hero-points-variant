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

## Architect-review red phase (2026-10-30, branch fix/issue-3-negative-modifier)
Run: `node --test tests/` against developer's scripts/reroll.js and scripts/module.js. 52 tests, 30 pass, 22 fail. All failures are behavioural (no import errors).
New files: tests/failclosed.test.mjs, tests/hook.test.mjs; helpers added to tests/helpers/fake-roll.mjs (cachedDie, parenthetical, pool, makeRollNested, snapshot).

| Behaviour | Tests | Status |
|-----------|-------|--------|
| Fail-closed: throw on `*`, `/`, `%`, Parenthetical, Pool, string/undefined/NaN term total | 9 throw + 9 no-mutation | 18 FAIL (no throw; dice floored and _total rewritten silently, e.g. `1d20 * 2` total becomes 12) |
| Unary minus `-2 + 1d20`, `+ -2`, `- -2` | 4 | pass on current code |
| Cached term.total updated after floor (6 -> 10) | 1 | FAIL (term.total stays 6) |
| Inactive (kh/kl dropped) dice not floored | 2 | FAIL (inactive 4 floored to 10) |
| Inactive dice excluded from term/roll total; stay inactive | 2 | pass (but only because inactive die is untouched and cache untouched; revisit after fix) |
| Hook (AC-7, AC-9): hero-points floors newRoll; other slug no-op; oldRoll unmutated; caught exception leaves roll unchanged | 5 | pass |
| Hook fail-closed: `1d20 * 2` logs error, roll unchanged | 1 | FAIL (no throw, roll mutated) |

AC-9 now covered at hook level (oldRoll snapshot unchanged). AC-6/12/10/11 remain BLOCKED.
