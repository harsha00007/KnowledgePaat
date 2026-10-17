# PHASE C.2b — SKILL GAP ENGINE API REPORT

## Status
COMPLETE — implemented and locally verified. No C.3, Phase D, UI or AI implementation.

## Architecture
Authenticated student session → own profile and target career → existing C.1 `phase_c_student_skill_snapshot` and `serializeStudentSnapshot` → server-only evidence adapter → unchanged C.2 `deriveSkillGapSemantics` → API response.

The API dynamically calculates results. It does not call admin-only Phase B RPCs or collect evidence inside the pure engine. C.1, C.2, Phase A and Phase B implementations are unchanged.

## Evidence Sources
Consumed:
- Own `profiles.skills`, fetched with role and `target_career_id` in one profile lookup.
- Own `career_user_roadmap_progress`: status and joined SKILL-node slug, limited to active nodes/sections/roadmaps belonging to the target career's composed roadmap.
- Own `career_plan_tasks`: ID, status and `related_skill`; parent `career_improvement_plans` ownership is also filtered. Historical tasks remain activity evidence; plan scores and aggregate readiness are not consumed.
- Own `student_test_attempts`: IDs only. These records have no universal canonical skill association; scores, answers and category IDs are unnecessary for the supported evidence model.

Profile claims and free-text task labels match only exact, trimmed, case-insensitive canonical names/slugs within the C.1 snapshot. Ambiguous or unmatched labels are not associated with skills. Roadmap node slugs match the same snapshot catalog labels; generic TOPIC nodes and unrelated roadmap activity are excluded. No fuzzy matching or alias inference is introduced.

Resource catalog access is not a persisted, canonically associated learner exposure history in the inspected roadmap implementation, so no resource-access evidence is invented. Existing aggregate career-progress helpers are not used to infer mastery.

## Evidence Mapping
Profile skills → PROFILE_CLAIM / CLAIMED. Learning and done roadmap status → ACTIVITY. Skip retains the skipped flag without mastery. Task in-progress/completed → ACTIVITY; pending/skipped never become proficiency. Assessment attempts → unassigned ASSESSMENT_ACTIVITY, exposed through sorted `unassignedAssessmentSourceIds`; they do not falsely mark any particular canonical skill as ASSESSMENT.

No adapter produces VERIFIED. Existing student-insertable attempts and learner-reported records are not authoritative canonical verification. The resolved-prerequisite test supplies a synthetic authoritative fact directly to the pure engine and response projection; the API does not manufacture one.

## Proficiency
Current proficiency stays `null` for every presently available evidence source. Canonical targets and prerequisite-only null targets come from the unchanged C.2 semantics. Legacy missing/beginner/developing/strong career-intelligence levels are not mapped. No numerical gap score is calculated.

## API
`GET /api/student/skill-gap`

No query parameters or request body. Returns:
- `career`: minimal C.1 career identity.
- `summary.requiredSkills`: directly mapped skills with required importance; excludes prerequisite-only supporting skills.
- `summary.gaps` / `satisfied`: counts of corresponding mapped-skill statuses across all mapping importance categories.
- `summary.blocked`: count of blocked rows, including supporting prerequisites.
- `skills`: complete C.2 rows, retaining requirement, evidence, proficiency, status, prerequisites, blockers, actionability, priority and explanation fields.
- `topGaps`: first ten actionable rows in the existing semantic priority order, including actionable prerequisite-only supporting gaps.
- `unassignedAssessmentSourceIds`: own assessment activity context without a fabricated skill association.

Responses use `Cache-Control: private, no-store` and a force-dynamic route. There are no timestamps or request-controlled identity fields in the calculation. Summary and top gaps are projections of existing rows, not a second gap model.

Errors: anonymous 401; non-student 403; missing target 400 TARGET_CAREER_REQUIRED; unavailable target 404; target/snapshot mismatch 409; invalid graph 422; unexpected database/evidence failures 500 SKILL_GAP_UNAVAILABLE. Known C.1 RPC errors remain controlled. No error becomes an empty successful result; underlying database details are neither returned nor logged by this module.

## Security
`auth.getUser()` establishes identity. The own profile role must be student. Every learner query explicitly filters session identity; tasks additionally filter parent-plan ownership. The C.1 snapshot RPC takes no client arguments and continues enforcing its own student authorization. All queries use the existing cookie/session Supabase client and its RLS context. No service-role credentials, new policies, grants or security-definer functions are introduced.

The new service imports `server-only`. The compiled client assets were inspected locally: 80 JavaScript assets passed checks for absence of the skill-gap server implementation, student snapshot RPC marker and locally configured Supabase server-secret values. No secret values were printed.

Local API fixtures assert student A/B filtering and client selector rejection; actual RLS behavior was separately exercised through existing isolated SQL suites. These checks do not attest deployed Supabase/PostgREST joins or GoTrue sessions.

## Performance
One authenticated own-profile lookup, one C.1 RPC and three parallel paginated evidence streams. Each stream selects only needed columns and uses stable primary-key ordering with 200-row pages. Reads fail closed at 100,000 rows per stream; the existing C.2 combined evidence bound also remains enforced. There are no per-skill queries, all-student queries or all-catalog loads. Assessment IDs and own historical task activity are necessary context; unrelated task labels never enter canonical skill results. The existing graph limits remain 5,000 skills and 20,000 prerequisite edges.

## Database
NO NEW TABLES. NO NEW PERSISTENCE. NO MIGRATION. No schema, RLS or grant changes. Existing SQL tests ran against the guarded isolated loopback PostgreSQL fixture on port 55439. Final fixture counts: careers 0, skills 0, roadmaps 0, auth users 0. Fixture server stopped after verification.

## Tests
| Suite | Result |
| --- | --- |
| New Skill Gap API/service | 41 passed / 0 failed |
| C.2 semantic domain | 40 passed / 0 failed |
| C.1 unit/API | 33 passed / 0 failed |
| C.1 isolated SQL | 17 groups passed |
| Phase A foundation + hardening | 65 passed / 0 failed |
| Phase A isolated SQL | 14 groups passed |
| Phase B Composer | 40 passed / 0 failed |
| Phase B isolated SQL | 12 groups passed |
| Composer delivery | 6 passed / 0 failed |
| Compiled client bundle isolation | PASS, 80 JavaScript assets |

New tests cover authentication, role checks, own identity filters, A/B isolation, query/body rejection, target errors/races, C.1 authorization, unpublished/invalid graphs, each supported evidence source, unknown proficiency, blocking, synthetic resolved prerequisite projection, summary contract, deterministic ordering, database failures, pagination beyond one page, ambiguous labels, malformed evidence and server-only boundaries.

No existing tests or assertions were weakened. The temporary regression result collector initially misclassified summary text containing “0 FAILED”; its classification was corrected and the affected suites were rerun successfully. This was a collector defect, not an application/test assertion failure.

## Regression
**29 passed / 0 failed / 2 blocked**, 31 existing TypeScript suites. Exact results: `phase-c2b-skill-gap-api-regression-results.json`.

Blocked: `test_admin_bulk_delete.ts`, `test_student_assessment_e2e.ts`. Configured remote access targets production; no authorized staging integration environment is available. They were not run against production.

## TypeScript
PASS — `npx tsc --noEmit`.

## Build
PASS — optimized `npm run build`, new dynamic student skill-gap route included, 78 static pages generated.

## git diff --check
PASS. New untracked task files also checked for whitespace and conflict markers.

## Production
PRODUCTION NOT TOUCHED. No remote database calls, destructive integration tests, deployments, schema changes or migrations. Environment files were not changed or committed.

## Remote Supabase
ACTUAL SUPABASE VERIFICATION REMAINS A SEPARATE RELEASE GATE

Authorized staging must validate cookie authentication, the C.1 RPC, PostgREST nested evidence joins and real cross-student RLS. Local fixtures and isolated PostgreSQL checks are not substitutes for that gate.

## Next Step
Phase C.2b Skill Gap Engine API is implemented and locally verified. Phase C.3 Personalized Roadmap Projection may begin.

## Files Added
- `frontend/lib/studentSkillGap.ts`
- `frontend/app/api/student/skill-gap/route.ts`
- `frontend/scripts/test_student_skill_gap.cjs`
- `docs/architecture/phase-c2b-skill-gap-api-regression-results.json`
- This report.

Pre-existing tracked modifications and prior untracked feature files were preserved. C.3 and Phase D were not started.
