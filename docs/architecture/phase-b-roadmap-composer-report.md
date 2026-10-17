# PHASE B ROADMAP COMPOSER REPORT

## Status

COMPLETE at repository and isolated PostgreSQL implementation level. Production release verification is outstanding. No production database or protected product subsystem was modified. Phase C has not started.

## Architecture

Published Career → canonical mapped Skills → incoming prerequisite closure → deterministic Composer → existing draft Roadmap/Sections/SKILL Nodes/Node Relationships → existing curated Resource attachments → existing Student Progress.

Canonical knowledge and delivery entities remain separate. The composer adds no persistent tables, progress system, resource library, AI, personalization or job matching. Existing builder, viewer, taxonomy and administration components are reused. The architecture and deployment contract are documented in `docs/architecture/phase-b-roadmap-composer.md`.

## Files Changed

Workspace: `C:/Users/ADMIN/Documents/CareerLaunch2`. Paths below are relative to it.

Modified existing files:

- `frontend/app/admin/roadmaps/page.tsx` — Compose Roadmap control in existing workflow.
- `frontend/lib/skillGraph.ts` — scoped career composition snapshot reader.
- `frontend/lib/catalogIntegrity.ts` — bounded ID-batch reader.
- `frontend/lib/roadmap.ts` — complete batched detail reads for large generated curricula.
- `frontend/lib/resource.ts` — complete batched resource attachments with explicit read failures.
- `frontend/lib/progress.ts` — complete progress reads beyond REST ceilings; preserve existing keys, scoring and writes. Static identity handling remains separate from UUID database identities.

New implementation files:

- `frontend/types/roadmapComposer.ts`
- `frontend/lib/roadmapComposerPlan.ts`
- `frontend/lib/roadmapComposer.ts`
- `frontend/lib/roadmapComposerApi.ts`
- `frontend/app/api/admin/roadmaps/compose/preview/route.ts`
- `frontend/app/api/admin/roadmaps/compose/route.ts`
- `frontend/components/roadmaps/RoadmapComposerModal.tsx`
- `supabase/migrations/roadmap_composer_phase_b.sql`

New tests and evidence:

- `frontend/scripts/test_roadmap_composer.cjs`
- `frontend/scripts/test_composer_delivery.cjs`
- `frontend/scripts/test_roadmap_composer_database.cjs`
- `supabase/tests/phase_b_composer.sql`
- `docs/architecture/phase-b-regression-results.json`
- `docs/architecture/phase-b-roadmap-composer.md`
- `docs/architecture/phase-b-roadmap-composer-report.md`

Preexisting tracked sitemap and layout changes, and all preexisting untracked feature work, were preserved. Nothing was staged, reset or committed. Because existing Phase A/roadmap files are untracked, tracked `git diff` excludes most feature changes; this manifest records this turn's actual scope.

## Database Changes

Additive migration: `supabase/migrations/roadmap_composer_phase_b.sql`.

- Nullable `career_roadmaps.composer_career_id` FK to canonical career, ON DELETE SET NULL; delivery/progress survive canonical deletion.
- Nullable `career_roadmaps.composer_version`, constrained to null/version 1.
- Partial unique career/version identity index.
- Index for active curated `SKILL` node slug matching.
- Read-only `phase_b_composer_snapshot(uuid)` RPC.
- Atomic `phase_b_compose_roadmap(uuid,text,uuid[],jsonb)` RPC.

No persistent tables, existing IDs, data rewrites or RLS policy replacements. Session-local generation validation workspaces are temporary and dropped at transaction end. The migration applied and reapplied successfully to the dedicated local PostgreSQL database, following reviewed existing prerequisite schemas. It was not applied to staging or production.

## Composer Algorithm

Resolve and authorize the selected published career; read all its mappings, importance, proficiency target, core flags and order. Expand incoming prerequisite closure, deduplicating shared branches. Reject unpublished selected requirements/prerequisites and invalid graphs. Bound the closure at 5,000 skills/20,000 edges.

Pure Kahn sorting chooses available foundation skills first, then mapping order, core flag, skill display order, name using stable code-point comparison and UUID. Only actual prerequisite edges determine dependencies. Cycles fail without partial output. Required/recommended/core branches propagate required status to prerequisites; optional-only branches remain optional.

Emit at most two existing curriculum stages, Foundation and Core Skills, each containing existing SKILL nodes. Canonical descriptions and target proficiency are retained. Node learning times use the existing positive 30-minute default, explicitly flagged for admin estimate review; no inferred hours or new topic content is invented. Roadmap metadata uses existing category/difficulty/duration conventions. Global dependencies become directed curriculum PREREQUISITE edges.

Resource candidates come from active curated attachments on existing active SKILL nodes with exactly matching canonical slugs. Select actual recommendation/priority pairs, rank deterministically and attach up to five active existing resources per skill. No resources are created. Missing resources yield warnings.

## Idempotency

The first call creates one draft with `<career-slug>-composed-v1`. A manually authored slug collision produces an explicit error, never adoption. The canonical career UUID/version pair is the generation identity. Every subsequent call returns the same roadmap unchanged, including admin-edited or published content. Options and later graph changes do not overwrite it. Destructive regeneration is not implemented. Concurrent calls produced exactly one created and one existing response with the same roadmap ID.

## Transaction Safety

PASS locally. The generation RPC requires READ COMMITTED, shares Phase A's transaction mutation lock and freezes resource/curriculum curation during snapshot validation and insertion. A changed fingerprint rejects stale preview. SQL validates the supplied ordering and derives persisted content from the current canonical snapshot. Roadmap, sections, nodes, directed edges and resource attachments commit together.

A deliberately injected node-insertion failure after roadmap/section creation left no partial hierarchy. Corrupt-cycle, wrong-order, stale-preview and manual-slug-collision scenarios failed without partial generation. Direct SQL and concurrent scale tests ran against PostgreSQL rather than simulated application prechecks.

## Security

API identity comes from Supabase `auth.getUser()` and persisted administrator role; body role/user/roadmap flags are rejected. Anonymous API requests receive 401, students 403. RPCs independently validate `auth.uid()` and the hardened admin helper.

Both Phase B RPCs are SECURITY INVOKER with fixed empty search path. Existing RLS is enabled and unchanged. Anonymous/PUBLIC execution is revoked; authenticated execution is granted explicitly and gated internally by administrator identity. Actual local ACL inspection confirmed this. No broad service-role or security-definer composer bypass was added. Known errors are explicit; SQL internals are not exposed. Existing logging records IDs, counts and elapsed time without secrets.

The local database uses a minimal Supabase auth scaffold and explicitly provisioned test grants. It does not prove deployed GoTrue/PostgREST, policies or table grants. Authorized Supabase staging verification remains a release gate.

## Tests

- Composer planner/service/API boundary: **40 passed / 0 failed**.
- Delivery compatibility: **6 passed / 0 failed**, including complete 1,201-node/resource/relationship/progress reads with enforced REST row/ID limits.
- Database: **12 groups passed / 0 failed / 0 blocked locally**. Eight direct SQL fixture groups plus four actual snapshot → TypeScript planner → persistence/concurrency scale groups (1, 5, 50, 1,201 skills).
- Phase A: **65 application checks passed / 0 failed**, plus the existing live local SQL/RLS/publication/concurrency suite PASS after Phase B migration.
- Broad existing repository run: **27 suites passed / 2 failed / 2 blocked**; detailed evidence in `phase-b-regression-results.json`.
- TypeScript: **PASS**, `npx tsc --noEmit` from `frontend`.
- Production build: **PASS**, `npm run build`; 78 static pages generated and both composer routes compiled.
- Final `git diff --check`: **PASS**.

The broad run exposed four failing assertions in two existing suites:

1. `test_company_name_gate.ts`: cancelled-subscription effective plan and Premium company visibility (24/26 passed).
2. `test_student_sidebar_independent_scroll.ts`: content scroll-wrapper and My Profile navigation assertions (22/24 passed).

The relevant subscription/config/StudentLayout files are unchanged; these failures were not introduced by composer code. They were reported and left intact because entitlements and unrelated UI are protected scope. This is not an all-green regression claim.

`test_admin_bulk_delete.ts` and `test_student_assessment_e2e.ts` are BLOCKED: they load the configured Supabase environment and can access or mutate remote product fixtures. No authorized integration environment was available, and they were not pointed at production. Existing mock/source-assertion suites are not counted as live payment or production auth verification.

## Student Progress

The composer never inserts, updates or deletes learner progress. It generates new node UUIDs once and returns them unchanged on repeats. Actual stored progress survived repeated composition after publication and admin title edits. Delivery queries were batched because unpaginated reads could truncate large graphs/progress; existing progress keys, writes, local/static compatibility and calculation functions remain unchanged.

## Resource System

Existing resource UUIDs, URL records, priorities and recommendation flags are reused through existing node-resource attachments. Inactive resources are excluded. Direct SQL confirms identity/flag preservation. Delivery mocks confirm all attachments can be read beyond the REST row ceiling. There is no duplicate resource record or external scraping.

## Phase A Regression

Foundation checks (32), hardening checks (33) and the guarded PostgreSQL hardening suite passed. Existing canonical graph/publication mutation behavior and role protection remain unchanged. The only skillGraph extension is a new scoped reader.

## Remaining Risks

- Actual deployed Supabase schema, grants, session behavior, full admin UI workflow and elevated-session public API integration remain unverified. Migration deployment must precede application deployment.
- Two existing product suites fail and two environment-dependent integration suites remain blocked.
- Exact-slug resource association is conservative and may yield zero resources; drafts need editorial review. Learning times use existing defaults until reviewed.
- Global generation locking trades concurrency throughput for integrity; closures exceeding supported limits fail explicitly.
- Regeneration is intentionally unavailable; later graph changes require review through existing builder workflows rather than automatic replacement.

## Phase C Readiness

NOT READY FOR PHASE C. Resolve the unrelated failing regression assertions, run the two blocked product integrations against an authorized environment, and validate migration/session/RLS/grant/UI behavior in actual Supabase staging before release. No production data changes or Phase C work were performed.

Final branch remains `dev`. Final status preserves the three preexisting tracked modifications and feature trees plus the files listed above. Tracked diff statistics remain 3 files, 36 insertions, 3 deletions; this turn's roadmap/Phase A additions are in untracked trees. Local test fixtures were rolled back or explicitly cleaned, and the isolated verification server was stopped after the final tests.
