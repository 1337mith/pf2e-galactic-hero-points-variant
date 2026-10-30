## Roles
- The human is the product owner: owns priority, and is the only one who
  accepts or rejects stories and features.
- Agents: architect, ux-expert, systems-analyst, developer, tester.
- Agents advise, build, and verify. They never set rank or accept work.
- Pause and ask the product owner at these gates: go/no-go after feasibility,
  backlog rank, story acceptance, feature acceptance.

## Shared artifacts
- docs/ideas/          idea briefs (problem, users, benefit hypothesis, metrics)
- docs/architecture.md architecture notes; docs/adr/ decision records
- docs/ux-notes.md     UX findings
- docs/requirements.md features, stories, acceptance criteria
- docs/backlog.md      rank, status, owner
- docs/bugs.md         bug log
- docs/test-report.md  test and acceptance results

## Workflow
1. Idea brief
2. Feasibility + desirability (architect, ux-expert)
3. Elaboration (systems-analyst)
4. Refinement (developer, tester)
5. Prioritization (product owner)
6. Build loop per story
7. Feature acceptance
8. Release and measure
9. Retrospective

## Build loop (test-driven development)
1. tester writes failing unit tests and confirms they fail.
2. developer writes the minimum code to pass, then refactors.
3. architect reviews the code.
4. tester verifies acceptance criteria and runs the full regression suite.
5. ux-expert reviews user-facing changes.
6. Product owner accepts or rejects.
- Only the tester edits files under tests/. Only the developer edits application code.
- For bugs: first write a test that reproduces the bug, then fix it.

## Definition of Ready
Story has acceptance criteria (including relevant NFRs and accessibility),
is sized, testable, dependencies identified, and fits in one iteration.

## Definition of Done
Tests written first and passing, full regression suite green, architect
review complete, UX review complete for user-facing changes, no open
critical/major bugs, docs updated, product owner accepted.
EOF
