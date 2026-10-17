# PHASE C — STUDENT SNAPSHOT IMPLEMENTATION REPORT

Verified 2026-10-08 on branch `dev`. Scope: prerequisite snapshot infrastructure only. No Skill Gap Engine, personalized UI, learning pace/time fields, feature flag, AI, assessment/payment/job changes or Phase D.

## Status

**COMPLETE at repository and isolated PostgreSQL level.** Real Supabase Auth/PostgREST and deployed-schema verification remain explicitly BLOCKED. This report does not clear the separate Phase B staging release gate.

## Architecture

Extracted the existing Phase B pure prerequisite validation, closure checking, required/optional propagation and deterministic Kahn ordering into `frontend/lib/prerequisiteGraph.ts`. The Composer planner calls this helper with its existing error mechanism and full canonical records. The student serializer calls the same helper with minimal canonical fields and controlled student errors. Composer ordering and output are unchanged; its 40 existing checks and 12 database groups pass.

Database authorization paths remain separate. Phase B continues calling its unchanged administrator-only snapshot and compose RPCs. Students call the new no-argument `phase_c_student_skill_snapshot()` RPC, which derives identity and selected career exclusively from `auth.uid()` and that profile. Its small prerequisite-only read query uses existing canonical tables, incoming prerequisite direction, recursive UNION deduplication and the existing 5,000-skill/20,000-edge bounds. It does not copy the Composer's resources, metadata generation, fingerprint or mutation implementation.

The shared TypeScript reader is reusable graph logic, not a new persisted graph system. The two SQL authorization paths deliberately remain distinct because this task prohibits modifying the Phase B RPC. Direct student RPC calls also undergo database publication, bounds and Kahn cycle validation before receiving any data.

## Target Career

Added nullable `profiles.target_career_id`, referencing `career_catalog(id)` with ON DELETE SET NULL. Existing profiles are left null; skills and preferred-role fields are untouched. A partial index supports the canonical association.

The selection API accepts exactly `{ "targetCareerId": "<uuid>" }` or `{ "targetCareerId": null }`. A UUID is treated as a requested selection, never as authorization: the server validates a published career and writes only the authenticated student's profile. Clearing is supported. There are no arbitrary profile fields or user/role inputs.

A database trigger validates direct profile inserts/target changes too. Non-null selections must reference a published career. Validation uses Phase A's existing mutation advisory lock under READ COMMITTED to prevent stale publication checks. Unchanged targets and null selections preserve ordinary profile writes and Auth provisioning behavior. If a selected career is subsequently unpublished, snapshot reads fail explicitly; existing profiles are not rewritten.

## Student Snapshot

Public response:

```json
{
  "career": { "id": "uuid", "slug": "career-slug", "name": "Career" },
  "skills": [{ "id": "uuid", "slug": "skill-slug", "name": "Skill", "displayOrder": 0 }],
  "careerSkillMappings": [{ "skillId": "uuid", "importance": "required", "proficiency": "working", "core": true, "order": 0 }],
  "prerequisites": [{ "prerequisiteSkillId": "uuid", "dependentSkillId": "uuid", "relationship": "prerequisite" }]
}
```

Skills are returned in the existing deterministic prerequisite order; mappings follow that order; edges use stable endpoint ordering. Optional mappings remain optional. Only the target's mapped skills and incoming prerequisite closure are included. No descriptions, admin notes, creator IDs, other careers, resources, assessments, profile details or learner evidence are returned.

Unpublished required skills or prerequisites reject the whole snapshot instead of producing a misleading incomplete graph. Invalid/malformed RPC data, cycles, duplicate mappings, unsupported proficiency values and exceeded bounds fail closed. SQL returns one JSON RPC result, avoiding ordinary REST row truncation; a 1,201-skill chain passed through both actual SQL and TypeScript.

## Security

- API authentication uses Supabase `auth.getUser()`; anonymous or invalid authentication receives 401.
- Persisted `profiles.role` must be `student`; the student path does not add broad administrator access.
- Profile reads and updates explicitly scope `id` to the authenticated user. Existing ownership RLS and role-protection triggers remain unchanged.
- GET accepts no query parameters or authorization body. PUT rejects extra keys, including user IDs and role flags.
- The no-argument RPC independently checks authentication and persisted student role and resolves the target itself. The API detects target changes between its profile read and RPC response and asks the caller to reload.
- The dedicated RPC is STABLE, SECURITY DEFINER, fixed empty search path, explicitly qualified objects and a 15-second timeout. Definer visibility is needed to detect hidden prerequisites; publication checks precede its allowlisted response. Its body contains only reads and local computation.
- PUBLIC/anon EXECUTE is revoked; authenticated EXECUTE is explicit. The target-validation trigger function has no direct PUBLIC/anon/authenticated execution grant.
- SQL details are not logged or returned by the new student handler. Unexpected database errors produce controlled 503 responses, never empty graphs.
- Responses use `Cache-Control: private, no-store` and dynamic route handling.
- No service-role key is used. Client source and the production browser bundle were scanned without printing secrets.

## Phase B Protection

`supabase/migrations/roadmap_composer_phase_b.sql` and its deployed local snapshot/compose definitions were not edited or replaced. Both still require administrator privileges and reject students. Admin snapshot and real local composition/concurrency/idempotency checks pass after the additive migration.

Only the pure planner's graph block was extracted to a shared helper. No generation rules, tables, nodes, resource IDs, progress writes or authorization paths were changed.

## Database

Migration: `supabase/migrations/student_career_skill_snapshot_phase_c.sql`.

- Nullable profile target column with canonical FK/ON DELETE SET NULL.
- `idx_profiles_target_career` partial index.
- `phase_c_validate_target_career()` trigger function and `phase_c_validate_target_career` trigger.
- `phase_c_student_skill_snapshot()` read-only RPC with explicit grants.

No new tables, replacement policies, data deletion, existing-record updates or ID rewrites. The migration applied and reapplied successfully only to the dedicated local verification database. It was not applied to production or a remote Supabase project.

Rollback considerations: disable/deploy away from the two new endpoints first. Leaving the nullable column and unused read RPC in place is non-destructive. A later authorized removal would lose saved career selections if the column is dropped; preserve them before any such cleanup. This task supplies no destructive rollback script and does not reverse Phase A/B objects.

## API

- `GET /api/student/career-skill-snapshot` — own target's minimal bounded graph; missing target 400, unavailable target 404, forbidden role 403, graph validation 422, database availability 503.
- `PUT /api/student/target-career` — select/clear the authenticated student's target with published-career validation.

Existing profile UI writes directly through its established Supabase client, so the narrow selection endpoint is additive rather than a replacement profile API. No UI was requested or added for this infrastructure task.

## Tests

| Validation | Passed | Failed | Blocked |
| --- | ---: | ---: | ---: |
| Student snapshot unit/API contracts | 33 | 0 | 0 |
| Student snapshot isolated PostgreSQL groups | 17 | 0 | 0 |
| Phase A foundation + hardening | 65 | 0 | 0 |
| Phase A isolated PostgreSQL groups | 14 | 0 | 0 |
| Phase B Composer | 40 | 0 | 0 |
| Delivery compatibility | 6 | 0 | 0 |
| Phase B isolated PostgreSQL groups | 12 | 0 | 0 |
| Actual Supabase Auth/RPC/API session checks | 0 | 0 | 1 verification group |

New scripts: `frontend/scripts/test_student_career_snapshot.cjs` and `frontend/scripts/test_student_career_snapshot_database.cjs`. SQL fixtures: `supabase/tests/student_career_skill_snapshot.sql`.

Unit/API tests use explicit mocks and do not claim deployed Auth verification. SQL tests exercise actual PostgreSQL RLS, role escalation rejection, student A/B isolation, unpublished/invalid selections, minimal disclosure, admin-only Composer protection, missing/archived dependencies, deliberately corrupted legacy cycles, 5,001-node and 20,001-edge rejection, deep 1,201-node traversal, grants and fixed search path. SQL responses are additionally passed through the actual shared TypeScript reader/serializer.

The SQL fixtures are guarded to the exact dedicated local database and transactionally rolled back. Deliberate trigger disabling for corrupt fixtures occurs only in that isolated transaction and is restored. Final career, skill, roadmap and auth-user counts are zero; the isolated server was stopped. The existing PostgreSQL service was not modified.

Real Supabase tests remain BLOCKED because the configured remote target is production and no authorized staging administration/test identities are available. No production request was made this turn.

## Regression

**29 passed / 0 failed / 2 blocked** across the same 31 existing TypeScript product suites. Details: `phase-c-student-snapshot-regression-results.json`.

Admin bulk delete and student assessment E2E remain BLOCKED against an authorized integration environment. They were not pointed at production. Existing test expectations and guards were preserved. Roadmap viewer, Career Journey, profile, progress, resources, security, payment and assessment regression scripts pass. These source/mock regressions do not constitute live production integration claims.

## TypeScript

**PASS** — `npx tsc --noEmit` from `frontend`.

## Build

**PASS** — `npm run build`, 78 static pages and both new student endpoints compiled. Browser JavaScript scan found no service-role environment reference, secret-key pattern or service-role JWT.

## git diff --check

**PASS.** Most feature files are preexisting untracked work, so tracked Git diff excludes them. This task's file manifest is below. Existing tracked sitemap/layout/subscription/test changes were preserved; nothing was staged, committed or reset.

## Production

**PRODUCTION NOT TOUCHED**

No remote calls, migrations, fixtures, grants, RLS edits, profile updates or deployments. No environment files changed or secrets exposed.

## Next Step

Student prerequisite snapshot is implemented and verified.
Phase C Skill Gap Engine can now begin.

This statement concerns the repository architecture and local validation. Actual Supabase verification and migration deployment remain separate gates; no production release readiness is claimed. The Skill Gap Engine and Phase D were not started.

### Files created or changed by this task

- Modified: `frontend/lib/roadmapComposerPlan.ts` (preexisting untracked file).
- New: `frontend/lib/prerequisiteGraph.ts`.
- New: `frontend/lib/studentCareerSnapshot.ts`.
- New: `frontend/app/api/student/career-skill-snapshot/route.ts`.
- New: `frontend/app/api/student/target-career/route.ts`.
- New: `supabase/migrations/student_career_skill_snapshot_phase_c.sql`.
- New: `supabase/tests/student_career_skill_snapshot.sql`.
- New: `frontend/scripts/test_student_career_snapshot.cjs`.
- New: `frontend/scripts/test_student_career_snapshot_database.cjs`.
- New: `docs/architecture/phase-c-student-snapshot-regression-results.json`.
- New: `docs/architecture/phase-c-student-snapshot-report.md`.
