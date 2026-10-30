# Backlog

Rank, status and owner. The product owner (PO) owns priority; the systems-analyst only records it. Status follows the Definition of Ready in CLAUDE.md (details in docs/requirements.md). Owner is a role.

Last updated: 2026-10-30.

| Rank | Item | Status | Owner |
|---|---|---|---|
| 1 (PO-stated: reroll feature group, top priority, only current feature) | B-1 Issue #3 "All rerolls seem to get set to 10?" incl. BUG-1/BUG-2 | DONE / ACCEPTED by PO 2026-10-30 (v1.1.0, Foundry min 14, verified 14.369). Issue #3 closure still awaits reporter confirmation (PO decides) | developer, tester |
| 1 (PO-stated: reroll feature group) | S-1 Floor applied to hero point rerolls | PARTIALLY ACCEPTED 2026-10-30: AC-1..5, 7..9, 13 accepted. Remaining open: AC-6 (kh/kl) BLOCKED; AC-10, AC-11, AC-12, AC-14 BLOCKED or UNVERIFIED | developer (build), tester (tests first) |
| 1 (within-group order: PO to decide) | S-2 sf2e added to module.json (PR #4; sf2e support shipped) | NOT STARTED. S-1/B-1 dependency now met (unblocked); ordering is the PO's. Manifest ACs READY; AC-20 version and AC-21/22 behavior still need decisions/smoke test | developer, tester |

Notes
- Group rank 1 was stated by the PO on 2026-10-30. The PO's work order was: fix the bug first (B-1, done). Ordering of the remaining S-1 work and S-2 inside the group is not decided by the analyst.
- NFR items (console logging gating, robustness) travel with S-1 and have no separate rank.

## Decided by the PO (2026-10-30)
- Architect's spike: discarded (no-go; spike branch discarded).
- Version: 1.1.0; Foundry minimum 14 (verified 14.369). v13 is no longer claimed.

## Still open (PO has not decided)
- Chat card note on adjusted rerolls.
- Issue #3 reporter confirmation on a fixed build (who asks, and when to close).
- Release workflow: now fixed on this branch; PO has not yet decided whether it derives or validates version from the tag, or accepted the fix.
- S-1 remainder: kh/kl (AC-6), fortune/misfortune (AC-12), non-check d20s (AC-14), degree-of-success reading (AC-10).
- S-2: sf2e id, `pf2e.reroll` emission and native handling (Q8, Q10); order relative to S-1 remainder.
