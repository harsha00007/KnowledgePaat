# PHASE C.2 — SKILL GAP SEMANTICS REPORT

## Status
COMPLETE — pure domain semantics only. No conflicting authoritative repository rule was found. The full Skill Gap Engine API, evidence collection, UI, C.3 and Phase D are outside this implementation.

## Evidence Model
- CLAIMED: learner-declared profile skill; no proficiency inferred.
- ACTIVITY: roadmap learning/done or learner-reported task activity; no proficiency inferred.
- ASSESSMENT: skill-associated assessment activity; no proficiency inferred. Unmapped attempts retain their source IDs as unassigned assessment context, without inventing a canonical association.
- VERIFIED: a separate trusted authoritative fact input. No current repository adapter produces such facts from profile claims, resource access, progress, tasks, assessment scores or aggregate readiness. Verified test fixtures are synthetic domain inputs, not attestations of actual learner records. A future producer must establish canonical association and authoritative provenance before supplying this input; request payloads must never supply it directly.

Collapsed evidence precedence is VERIFIED, ASSESSMENT, ACTIVITY, CLAIMED, UNKNOWN. Independent claim, activity, assessment, exposure, skip and verification flags remain available. Resource access records exposure; skip records skipping. Neither becomes mastery. Raw learner activity cannot declare VERIFIED or include a proficiency field.

## Proficiency
Canonical proficiency reuses `ProficiencyTarget`: beginner / working / proficient / advanced. Unknown current proficiency is `null`. No existing evidence source is automatically promoted to any canonical level. Trusted canonical facts are compared ordinally against the career target; no numerical proficiency distance is calculated. Multiple trusted facts resolve deterministically to their highest supported level.

The existing career-intelligence vocabulary missing / beginner / developing / strong remains unchanged and is not converted into canonical proficiency.

## Prerequisite-only Skills
Skills present only through prerequisite closure retain `targetProficiency = null`, `mappedToCareer = false` and `prerequisiteOnly = true`. Their status is PREREQUISITE_UNVERIFIED unless authoritative canonical evidence exists, in which case it is PREREQUISITE_VERIFIED. Any supported authoritative canonical level supplies evidence for an unmapped prerequisite; no target threshold is invented. A prerequisite that also has a career mapping must meet its own mapped target.

## Blocking
All direct prerequisites are evaluated using the existing graph's topological order. A prerequisite blocks a dependent if it lacks sufficient authoritative evidence or has an unresolved earlier prerequisite. Dependent rows remain visible with `blocked = true`, `actionable = false` and direct blocking IDs in `blockedBy`. Earlier missing ancestors remain inspectable in the preceding dependency rows.

Missing evidence uses: “Prerequisite skill requires evidence before this skill can be prioritized.” A verified intermediate prerequisite with an unresolved earlier dependency uses an explicit dependency-chain explanation. Target satisfaction and prerequisite readiness are separate: a SATISFIED skill can remain blocked by unresolved prerequisites and is never actionable.

## Priority
Actionable rows rank first, followed by unblocked rows before blocked rows. Within those groups the categories are core required, required, recommended, prerequisite-only supporting, optional. Ties use core flag, mapping order, skill display order, codepoint name ordering and skill UUID. Satisfied rows remain visible but are not actionable recommendations. `priority` is a one-based ordering position, not a gap score. Input order, duplicate activity events, clocks, random values and LLMs do not affect ranking.

## Existing Architecture
Reused:
- `ProficiencyTarget` and `SkillImportance` from `frontend/types/careerSkillGraph.ts`.
- C.1 `serializeStudentSnapshot` return type through a type-only import; no runtime snapshot service, Supabase or Next import.
- `readPrerequisiteGraph` for bounded graph validation, prerequisite closure, incoming dependencies and stable topological order.
- `graphTextOrder` for deterministic string ordering.

The domain model performs no I/O. Phase B, C.1, assessment, progress and career-intelligence implementations were not changed. Evidence and graph inputs fail closed on invalid shape, association, vocabulary, duplicate mappings, cycles or exceeded bounds.

Task files:
- `frontend/types/skillGapSemantics.ts`
- `frontend/lib/skillGapSemantics.ts`
- `frontend/scripts/test_skill_gap_semantics.cjs`
- `docs/architecture/phase-c2-skill-gap-semantics-regression-results.json`
- This report.

Pre-existing tracked changes and prior untracked implementation files were preserved. No environment files were changed or committed.

## Database
No database schema, persistence, migration, RLS or grant changes were required. Existing SQL checks ran only against the isolated loopback PostgreSQL verification fixture on port 55439. Fixture counts after verification were careers 0, skills 0, roadmaps 0 and auth users 0. The fixture server was stopped afterward. These local SQL checks do not attest Supabase authentication or PostgREST behavior.

## Tests
| Suite | Result |
| --- | --- |
| New skill-gap domain checks | 40 passed / 0 failed |
| C.1 snapshot unit/API checks | 33 passed / 0 failed |
| C.1 isolated SQL verification | 17 groups passed |
| Phase A foundation and hardening | 65 passed / 0 failed |
| Phase A isolated SQL verification | 14 groups passed |
| Phase B Composer | 40 passed / 0 failed |
| Phase B isolated SQL verification | 12 groups passed |
| Composer delivery | 6 passed / 0 failed |

Domain checks cover all 17 requested cases, plus invalid inputs, authoritative-input separation, canonical target comparisons, chained blocking, optional branches, deterministic ties, bounds and input immutability. Existing tests were not skipped by rewriting assertions, mocked, weakened or replaced.

## Regression
Existing TypeScript regression suites: **29 passed / 0 failed / 2 blocked**, 31 suites total. Exact suite results are recorded in `phase-c2-skill-gap-semantics-regression-results.json`.

Blocked suites: `test_admin_bulk_delete.ts` and `test_student_assessment_e2e.ts`. The configured remote target is production; no authorized staging integration environment is available. They were not executed against production. Actual Supabase authentication/PostgREST integration remains unverified. The domain-only task is complete; this is not a staging release-gate clearance.

## TypeScript
PASS — `npx tsc --noEmit`.

## Build
PASS — `npm run build`, optimized Next.js build, 78 static pages.

## git diff --check
PASS. Newly added files were also checked for trailing whitespace and conflict markers because unstaged untracked files are outside ordinary `git diff` coverage.

## Production
PRODUCTION NOT TOUCHED. No remote database calls, remote tests, migrations or deployments were performed. No secrets were printed or recorded.

## Next Step
Phase C.2 skill-gap semantics are now defined and implemented.
The full Skill Gap Engine API can now be implemented.
