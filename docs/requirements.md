# Requirements: Galactic Hero Points Variant

Source of truth for features, stories and acceptance criteria. Owner of priority and acceptance: product owner (PO). Rank lives in docs/backlog.md (not set here).

Status legend: READY = meets Definition of Ready (CLAUDE.md). BLOCKED = needs PO answer (see Open Questions).
Tags: [CURRENT] = behavior the code at scripts/module.js currently intends. [RULE] = decided by the authoritative rule text below. [ASSUMPTION] = unverified; PO must confirm. [OPEN] = unresolved (rule text silent or PO undecided).

## Authoritative rule text and PO answers (2026-10-30)

Source: Archives of Nethys, GM Core pg. 87, Galactic Hero Points, "Heroic Rerolls", supplied verbatim by the PO:

> "When using this variant rule to reroll a d20 result using a Hero Point, if the result on the dice is less than a 10, increase the dice result to become a 10. This means that a result of a 9 would become a 10, a result of a 2 would become a 10, and a result of 17 would remain as 17."

Intro: the variant makes Hero Points more heroic by letting you reroll low results into something better.

PO statements, dated 2026-10-30:
- "The rule text above is authoritative."
- The PO can run a Foundry VTT v14 world. v14 is therefore the only available test environment. A v13 test environment is NOT yet available. Risk: the minimum compatibility claim of 13 (and verified 13.348) cannot be re-verified by us until a v13 environment exists.
- sf2e is officially supported and has shipped (resolves the PR #4 support question; the PO called it Q4, it is Q8 first half / S-2 here). Still unverified that sf2e emits `pf2e.reroll` with the same arguments; AC-21/22 stay flagged until smoke-tested.
- Priority: the reroll feature (S-1, including B-1 / issue #3, which is the same behavior, and S-2 sf2e manifest) is the only current feature and the top priority. Recorded in docs/backlog.md.

What the text decides: it applies to a d20 reroll made with a Hero Point; it acts on the dice result, not modifiers; it applies per d20 die result; the die value becomes 10 (so the adjusted die value is what feeds the total).
What the text is silent on (kept [OPEN]): fortune/misfortune and keep-higher/keep-lower interaction, a chat card note, d20 rolls that are not checks, and explicit degree-of-success wording.

### Decided by the PO (2026-10-30)
- B-1 (issue #3, incl. BUG-1/BUG-2) ACCEPTED. S-1 PARTIALLY ACCEPTED: AC-1..5, 7..9, 13.
- Spike branch discarded (go/no-go resolved: no-go).
- Version 1.1.0; Foundry minimum 14 (verified 14.369). Work order: fix the bug first.

### Still open (PO has not decided)
- Chat card note (Q6).
- Issue #3 reporter confirmation on a fixed build (Q7 superseded: logs no longer needed, bug fixed).
- Release workflow: fixed on this branch; PO has not decided whether it derives or validates version from the tag.
- Fortune/misfortune and keep-higher/lower (Q3 remainder, Q4); non-check d20s (Q2 remainder); whether sf2e has native handling (Q10).

## Current system (as read)

- scripts/module.js: on `ready`, registers `Hooks.on("pf2e.reroll", (oldRoll, newRoll, resource))`.
- If `resource?.slug === "hero-points"`: for each die in `newRoll.dice` with `faces === 20`, each `result.result < 10` is set to 10 (mutating the result in place). Then `newRoll._total` is recomputed twice: first as the sum of die results (this value is immediately overwritten, so it is dead code), then as the sum of `term.total` over `newRoll.terms` when numeric.
- Observation for investigation only (no root cause asserted): the final total relies on `term.total`; whether `term.total` of a Die term reflects edited `results` or a cached value is not established. Whether `newRoll.dice` and `newRoll.terms` contain the expected terms at hook time is unknown.
- Logging uses unconditional `console.log` on every reroll.
- module.json: version 1.0.3, compatibility minimum 13, verified 13.348, systems relationship: pf2e only.

## Feature F-1: Galactic Hero Point reroll floor

Benefit hypothesis: If a hero point reroll never yields a d20 result below 10, tables using the SF2e Galactic Hero Points variant get the rule's intended outcome without manual GM adjustment. Measure: no bug reports of wrong reroll values; players report rerolls matching the rule.

Feature acceptance criteria:
- All AC-1 to AC-14 pass in automated tests (where testable) and in a Foundry smoke test on v14 (the only environment available; v13 smoke test added when an environment exists).
- Issue #3 is closed with a regression test.

### Rule statement

[CURRENT] When a PF2e hero point reroll occurs (resource slug `hero-points`), each d20 result below 10 on the rerolled roll is treated as 10. Results of 10 or higher are unchanged. Modifiers are added after the adjustment.

[RULE] (Q1 resolved) Per GM Core pg. 87 "Heroic Rerolls": "if the result on the dice is less than a 10, increase the dice result to become a 10." Applies to a d20 reroll made with a Hero Point; acts on the dice result, not modifiers (Q2 partly resolved); per d20 die result (Q3 partly resolved). Because the dice result becomes 10, the adjusted die value feeds the total (Q5 total part resolved). Worked examples from the text: 9 becomes 10, 2 becomes 10, 17 stays 17.

[OPEN] Rule text is silent on: fortune/misfortune and keep-higher/lower, chat card note, non-check d20s. Explicit degree-of-success wording is also absent; "the dice result becomes 10" implies natural-1 steps follow the adjusted die, but PO to confirm (Q5 remainder).

### Story S-1: Floor applied to hero point rerolls

As a player spending a hero point
I want my rerolled d20 to count as at least 10
So that the variant rule is applied automatically.

Size: M. Dependencies: none open for AC-1 to AC-5 (now [RULE]); Q3/Q4/Q5/Q6 remainder for AC-6, 10 to 12, 14. Risk: depends on the shape of PF2e's `pf2e.reroll` payload (undocumented internal hook; may differ between PF2e versions).

Acceptance criteria (Given/When/Then):

- AC-1 (value at or above floor unchanged) Given a hero-points reroll whose d20 result is R where 10 <= R <= 20, when the hook runs, then that die result remains R and the roll total equals R + modifiers. [CURRENT]
- AC-2 (value below floor raised to exactly 10) Given a hero-points reroll whose d20 result is R where 1 <= R <= 9, when the hook runs, then the die result is exactly 10 and the roll total equals 10 + modifiers. [CURRENT; [RULE] "increase the dice result to become a 10"]
- AC-3 (only below-10 values change; counterpart of issue #3) Given hero-points rerolls producing each d20 value 1..20 in turn, when the hook runs, then the adjusted result equals max(R, 10) for every R; in particular, values 11..20 are never reduced to 10, and at least 11 distinct outcomes (10..20) are reachable. [CURRENT]
- AC-4 (modifiers preserved) Given a hero-points reroll formula `1d20 + M` (M positive, negative, or zero; multiple numeric terms and nested/flat bonus terms included), when the hook runs, then the total equals adjusted d20 + M. (A prior commit fixed dropped modifiers; this is its regression guard.) [CURRENT]
- AC-5 (non-d20 dice untouched) Given a reroll roll containing non-d20 dice (e.g. 1d6 bonus, 1d4), when the hook runs, then those results are unchanged even if below 10, and they contribute their own values to the total. [CURRENT]
- AC-6 (multiple d20s) Given a roll containing more than one d20 (e.g. 2d20), when the hook runs, then every d20 result below 10 is raised to 10 and others unchanged, and the total matches the roll's own evaluation rules. [RULE: per-die floor ("per d20 die result"). OPEN Q3 remainder: text is silent on keep-highest/lowest; current code uses a plain sum of terms, so kh/kl total correctness is not guaranteed]
- AC-7 (non-hero-point rerolls untouched) Given a `pf2e.reroll` event where `resource.slug` is anything other than `hero-points` (e.g. another resource), `resource` is undefined/null, or `resource.slug` is missing, when the hook runs, then newRoll dice results and total are unchanged and no error is thrown. [CURRENT]
- AC-8 (idempotence) Given a roll already adjusted by the hook, when the hook runs a second time on the same newRoll, then results and total are unchanged. [CURRENT expected; test to confirm]
- AC-9 (no mutation of oldRoll) Given any reroll event, when the hook runs, then oldRoll (dice results, total, terms) is deeply equal to its state before the hook. [CURRENT expected; verify]
- AC-10 (degree of success) Given a hero-points reroll adjusted from R<10 to 10, when the check outcome is determined, then the degree of success is computed from the adjusted die value 10 (total = 10 + modifiers; a raised natural 1 no longer triggers the natural-1 step). [RULE-implied: "the dice result" becomes 10; text has no explicit degree-of-success wording, PO to confirm]. Needs Foundry smoke test since PF2e computes the degree outside this module. READY pending PO confirmation.
- AC-11 (displayed vs internal consistency) Given an adjusted reroll, when the chat card is rendered, then the displayed d20 face is 10 and the displayed total is 10 + modifiers. [RULE-implied by the adjusted die feeding the total.] Whether the rendered card and PF2e outcome use the edited `results`/`_total` is unverified in code; needs reproduction in Foundry (B-1). A note on the card that the floor was applied is [OPEN Q6]; text is silent. Core part READY after B-1 shape info; note part BLOCKED.
- AC-12 (fortune/misfortune) Given a reroll that is subject to fortune or misfortune effects or keep-higher/keep-lower interplay with the original roll, when the hook runs, then the result is [OPEN Q4: rule text is silent]. BLOCKED.
- AC-13 (robustness) Given newRoll with no dice, no terms, or terms lacking numeric `total`, when the hook runs, then no exception is thrown and no unrelated roll is altered. [CURRENT partially; confirm with test]
- AC-14 (scope of rolls) Given a hero-points reroll of any d20 roll (attack, skill, save, perception, initiative), when the hook runs, then the floor is applied. [RULE: "reroll a d20 result using a Hero Point".] Non-d20 dice are untouched (AC-5). [OPEN Q2 remainder: text is silent on d20 rolls that are not checks, e.g. flat checks; current code floors any d20 in a hero-points reroll.] Check-type rolls READY; non-check d20s BLOCKED.

NFR/accessibility for S-1: see NFR section. Testability: AC-1 to AC-9, AC-13 are unit-testable with stubbed Roll-like objects and a stubbed `Hooks`; the stub mirrors the real Foundry Roll shape (dice, terms, `term.total`, `_total`); B-1 is fixed and accepted, so this is no longer missing. AC-10 to AC-12, AC-14 require Foundry smoke test.

Definition of Ready (re-evaluated 2026-10-30): AC-1 to AC-5, AC-7 to AC-9, AC-13 have criteria, are testable, sized, and rule-backed; stub fidelity still depends on B-1 roll-shape info. AC-10, AC-11 (core), AC-14 (checks) now READY pending PO confirmation of degree-of-success reading and a Foundry v14 smoke test. AC-6 (kh/kl), AC-11 (card note), AC-12, AC-14 (non-check d20s) remain BLOCKED (text silent). Story overall: PARTIALLY ACCEPTED by PO 2026-10-30 (AC-1..5, 7..9, 13 accepted). AC-6 (kh/kl) BLOCKED; AC-10, AC-11, AC-12, AC-14 BLOCKED or UNVERIFIED and remain open.

### Story B-1 (bug): Issue #3 "All rerolls seem to get set to 10?"

As a player using hero points
I want rerolls above 10 to keep their rolled value
So that the floor only helps when the die is below 10.

Status: DONE / ACCEPTED by PO 2026-10-30 (includes BUG-1 and BUG-2; v1.1.0, Foundry min 14, verified 14.369). Issue #3 closure awaits reporter confirmation (AC-17, PO decides). The text below is the original investigation record.

Size: M (investigation dominates). Type: bug; per CLAUDE.md, tester writes a failing reproducing test first, then developer fixes. Root cause is NOT asserted here.

Reported: Foundry v13 build 348, PF2e 7.7.2, module 1.0.3; second user on Foundry 14 reports "It only rolls 10." Open issue.

Expected: hero point reroll shows max(d20, 10) + modifiers (AC-3).
Actual (reported): every hero point reroll comes back as 10.

Repro steps as far as known: 1) Foundry v13/v14 with PF2e 7.7.2 and module 1.0.3 enabled; 2) a character makes a d20 check; 3) spend a hero point to reroll from the chat card; 4) observe result. Reported as consistent ("every reroll"). Unknown: which roll types, whether the displayed total or only the die face is 10, whether total includes modifiers, whether it happens without the module enabled (control).

Resolved: the roll shape was established and the failing test written and fixed; the list below is historical.

Information that was needed (historical):
1. What do `oldRoll`, `newRoll` and `resource` look like at hook time (class, `formula`, `dice[]` faces/results, `terms[]` types and `total`, `_total`, `total` getter, `_evaluated`)? Console output from the user's own logs with the existing `console.log` lines, or a captured JSON, would answer this.
2. Whether results are final at hook time or the roll is re-evaluated or its result replaced after the hook.
3. Whether the displayed chat card shows 10 as die face, as total, or both; and whether the displayed total equals 10 only when modifiers are zero.
4. Whether the raw dice values before patching were below 10 in those cases (log line "Adjusting d20 roll from X to 10" present or absent).
5. Any other active modules or PF2e settings (e.g. dice-so-nice, roll-mode changes).

Acceptance criteria:
- AC-15 Given the reproduction from the information above, when a test replays it with the captured roll shape and a d20 result of 15, then it fails on current code (documenting the bug) and passes after the fix with total = 15 + modifiers.
- AC-16 Given the fix, when tests for AC-1 to AC-4 run, then they pass; and a Foundry v14 smoke test over at least 20 hero point rerolls shows values both 10 and above 10, never a fixed constant. (v13 smoke test deferred: no v13 environment; reporter 1 used v13 build 348, so v13 behavior stays unverified by us.)
- AC-17 Issue #3 reporters are asked to confirm on a pre-release build before closing (PO decides closure).

Dependencies: roll shape info (items 1 to 4), Q7 (who obtains logs; PO undecided). The PO can run v14, so the roll shape can instead be captured by running the existing console.log lines in the PO's v14 world (reporter 2 also saw the bug on v14); this is a possible route if reporters cannot supply logs. Same behavior as S-1 AC-3 (the rule now confirms expected max(R,10)). Definition of Ready (re-evaluated 2026-10-30): expected behavior is now rule-defined, but still NOT ready (roll shape unknown, so a faithful failing test cannot be written); investigation can start immediately in v14.

## Feature F-2: SF2e system support

Benefit hypothesis: Users of the Starfinder 2e system (where the variant originates) can install and use the module without warnings, increasing the audience.

### Story S-2: Add sf2e to module.json (PR #4)

As a Starfinder 2e GM
I want the module to declare sf2e compatibility
So that Foundry lets me enable it without a system warning and it works.

Size: S (manifest) plus M for sf2e smoke test. Dependencies: S-1/B-1 (reroll behavior must be correct first, otherwise sf2e inherits the bug), Q8 to Q10. Testability: manifest checks automatable (JSON validity, schema); behavior needs manual Foundry + sf2e.

Acceptance criteria:
- AC-18 Given module.json, when parsed, then it is valid JSON and `relationships.systems` contains entries with `id` "pf2e" and "sf2e", each `type: "system"`. [from PR #4; verify the sf2e system id is exactly `sf2e` (ASSUMPTION Q8)]
- AC-19 Given the entries, when Foundry loads the module in a pf2e world and in an sf2e world, then no manifest validation errors or compatibility warnings appear in the console or setup screen, and the module can be enabled. [needs smoke test]
- AC-20 Given the manifest change, then `version` is bumped per policy (proposed: patch bump to 1.0.4 if shipped with the bug fix, or 1.1.0 if sf2e is shown as a feature; PO decides, Q9), and `manifest`/`download` URLs and tag match the new version, `compatibility.verified` reflects versions actually tested (minimum stays 13 unless PO changes it).
- AC-21 Given sf2e, when a hero point reroll occurs, then AC-1 to AC-9 apply identically. UNVERIFIED until a smoke test in Foundry with the sf2e system confirms (a) sf2e emits `pf2e.reroll` (not a differently named hook) and (b) the resource slug is `hero-points`. If either differs, a separate story is needed.
- AC-22 Given sf2e already has its own Galactic hero point handling (if any, Q10), when both are active, then the reroll is not double-adjusted and does not conflict. OPEN.
- AC-23 README and module description state which systems are supported.

PO 2026-10-30: sf2e is officially supported and has shipped; the support question is resolved. The sf2e system id `sf2e` is still worth confirming against the system manifest (Q8). Version bump policy is still undecided (AC-20). An sf2e smoke test environment is not stated as available; only a v14 world is.

Definition of Ready (re-evaluated 2026-10-30): manifest ACs (AC-18, 19, 23) READY; AC-20 BLOCKED on version policy and tag/version workflow decision; AC-21/22 still BLOCKED on smoke test (needs sf2e system in the v14 world) and Q10. Story: PARTIALLY READY.

## Non-functional requirements (architect to confirm)

- NFR-1 Compatibility: Foundry v14 minimum (verified 14.369). PF2e 7.7.2 minimum tested. v13 is not claimed because only v14 is available for testing (PO, 2026-10-30).
- NFR-2 No runtime dependencies: no libraries, no network calls, single ES module.
- NFR-3 Console: at the default log level the module emits no per-roll `console.log` output (at most one load message, or none). Met by deleting the per-roll logs (no opt-in debug flag). The only console output is a single `console.error` when the floor cannot be applied (fail closed).
- NFR-4 Robustness: hook must never throw (a throw could break PF2e's reroll flow); AC-13.
- NFR-5 Performance: hook work is O(number of dice); negligible.
- NFR-6 Failure mode: if the PF2e payload shape is unrecognized, the module leaves the roll unchanged.

## Accessibility / UX notes (ux-expert to review)

- The module currently produces no UI of its own; the adjusted value appears only through the PF2e chat card. Open (Q6): should the card indicate that a floor was applied (e.g. text such as "raised from 4 to 10 by Galactic Hero Points")? If added, the text must be real text (not color/icon only), readable by screen readers, and sufficient contrast under Foundry themes; it must not rely on a tooltip alone.
- Without such a note, players (including those using assistive tech) cannot tell why a displayed 10 occurred; this is a transparency concern, not a blocker.

## Definition of Ready summary

| Story | Size | Status | Blockers |
|---|---|---|---|
| S-1 floor rule | M | PARTIALLY ACCEPTED (AC-1..5, 7..9, 13). AC-6 kh/kl BLOCKED; AC-10, 11, 12, 14 BLOCKED or UNVERIFIED, open | Q3/Q4/Q6 remainder, v14 smoke test |
| B-1 issue #3 | M | DONE / ACCEPTED 2026-10-30 (incl. BUG-1/BUG-2) | reporter confirmation for closure (PO) |
| S-2 sf2e (PR #4) | S + M | NOT STARTED; S-1/B-1 dependency met; order is PO's. Manifest ACs READY; AC-20 version 1.1.0 decided (confirm tag/URLs); AC-21, 22 BLOCKED | sf2e smoke test, Q10 |

## Open questions for the product owner

1. RESOLVED [RULE] (2026-10-30): rule text is GM Core pg. 87 "Heroic Rerolls", quoted above.
2. PARTLY RESOLVED: applies to a d20 reroll with a Hero Point, die result only, never modifiers. OPEN: d20 rolls that are not checks (text silent).
3. PARTLY RESOLVED: per d20 die result. OPEN: keep-higher/lower (text silent).
4. OPEN: fortune/misfortune (text silent).
5. PARTLY RESOLVED: adjusted die value (10) feeds the total. Degree-of-success natural-1/20 steps implied to follow the adjusted die; PO to confirm.
6. OPEN: chat card note (PO undecided; text silent).
7. SUPERSEDED: logs no longer needed (B-1 accepted). OPEN: reporter confirmation on a fixed build before closing issue #3.
8. PARTLY RESOLVED: sf2e support confirmed and shipped. Still unverified: exact id `sf2e` and that it emits `pf2e.reroll` with slug `hero-points`.
9. PARTLY RESOLVED: version 1.1.0 decided. OPEN: whether the release workflow (fixed on this branch) derives/validates version from tag.
10. OPEN: does sf2e already implement Galactic Hero Points natively (conflict/double-adjust risk)?
11. RESOLVED: spike go/no-go decided; spike branch discarded.
12. RESOLVED: Foundry minimum raised to 14 (verified 14.369).
