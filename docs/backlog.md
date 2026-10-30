# Backlog

Rank, status and owner. The product owner (PO) owns priority; the systems-analyst only records it. Status follows the Definition of Ready in CLAUDE.md (details in docs/requirements.md). Owner is a role.

Last updated: 2026-10-30.

| Rank | Item | Status | Owner |
|---|---|---|---|
| 1 (PO-stated: reroll feature group, top priority, only current feature) | S-1 Floor applied to hero point rerolls | READY for rule-backed ACs; AC-6 kh/kl, AC-11 card note, AC-12, AC-14 non-check d20s BLOCKED | developer (build), tester (tests first) |
| 1 (within-group order: PO to confirm) | B-1 Issue #3 "All rerolls seem to get set to 10?" (same behavior as S-1) | NOT READY: roll shape info missing; investigation can start in v14 | tester (reproducing test), developer |
| 1 (within-group order: PO to confirm) | S-2 sf2e added to module.json (PR #4; sf2e support shipped) | Manifest ACs READY; version AC-20 and behavior AC-21/22 BLOCKED | developer, tester |

Notes
- Group rank 1 was stated by the PO on 2026-10-30. Ordering of S-1, B-1 and S-2 inside the group is not decided. The analyst's note, not a ranking: S-2 behavior depends on S-1/B-1 being correct.
- NFR items (console logging gating, robustness) travel with S-1 and have no separate rank.

## Still open (PO has not decided)
- Go/no-go on the architect's spike.
- Version bump policy (1.0.4 vs 1.1.0).
- Whether the release workflow derives or validates version from the tag.
- Chat card note on adjusted rerolls.
- Who obtains console logs for issue #3.
- Risk: only a Foundry v14 environment is available; the v13 minimum is unverified.
