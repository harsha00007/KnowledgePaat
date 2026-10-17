# PHASE A HARDENING REPORT

## 1. Status

COMPLETE WITH BLOCKED PRODUCTION VERIFICATION. Repository hardening is implemented. Database enforcement is supplied as an additive migration but has not been executed or verified against PostgreSQL. This is a release gate, not a claim that deployed security has changed.

Final branch: `dev`. Final status retains the tracked sitemap modification, two preexisting layout modifications and the existing untracked feature trees plus the new hardening files. Reviewed `git status --short`, `git diff --stat`, `git diff` and `git diff --check`. Tracked diff totals: 3 files, 36 insertions, 3 deletions; the sitemap accounts for 20 insertions and 1 deletion, while layout changes predate this task. Git's tracked diff excludes the untracked Phase A files, so the manifest below describes this task's full scope. No files were staged, committed or reset.

## 2. Files Changed

Paths below are relative to `C:/Users/ADMIN/Documents/CareerLaunch2`.

- `frontend/lib/catalogIntegrity.ts` — shared fail-closed query, pagination, search and batched-read helpers.
- `frontend/lib/careerCatalog.ts` — publication validation, public counts, bounded lists, health RPC.
- `frontend/lib/skillCatalog.ts` — pagination, stable ordering, explicit failures.
- `frontend/lib/careerSkillMap.ts` — scoped batched reads, allowed update fields and explicit failures.
- `frontend/lib/skillGraph.ts` — database cycle precheck, endpoint filtering, scoped mutations and graph pagination.
- `frontend/lib/roadmap.ts` — database precedence, inactive tombstones, batched counts and explicit failures.
- `frontend/types/careerSkillGraph.ts` — pagination metadata.
- `frontend/app/sitemap.ts` — published catalog and compatible roadmap URLs.
- `frontend/app/api/skills/[slug]/relationships/route.ts` — published endpoint filtering and pagination.
- `frontend/app/api/admin/skills/[id]/relationships/route.ts` — parent scope, UUID validation and pagination.
- `frontend/app/api/admin/skills/[id]/relationships/[relId]/route.ts` — parent-scoped deletion.
- `frontend/app/api/admin/skills/[id]/route.ts` — paginated relationships.
- `frontend/app/api/admin/skills/graph/route.ts` — paginated graph.
- `frontend/app/api/admin/skills/route.ts` — existing UI type filter compatibility.
- `frontend/app/api/admin/careers/[id]/skills/[skillId]/route.ts` — UUID validation and fail-closed lookup.
- `frontend/app/admin/careers/page.tsx` — pagination and visible list/health failures.
- `frontend/app/admin/skills/page.tsx` — pagination and visible failures.
- `frontend/app/admin/skills/graph/page.tsx` — page navigation and explicit partial-graph scope.
- `frontend/app/admin/skills/[id]/page.tsx` — repair detail response handling; relationship and picker pagination.
- `frontend/app/skills/[slug]/page.tsx` — public relationship pagination.
- `frontend/scripts/run_test.cjs` — installed TypeScript runtime adapter for existing tests.
- `frontend/scripts/test_phase_a_hardening.cjs` — service, API and seed regression checks.
- `frontend/scripts/test_phase_a_database.cjs` — guarded isolated PostgreSQL and concurrency runner.
- `frontend/scripts/seed_career_skill_graph_phase_a.ts` — explicit reviewed execution; insert-only seeding.
- `frontend/scripts/generate_sql_seed_phase_a.ts` — data-only insert-only SQL generation.
- `supabase/migrations/career_skill_graph_seed_phase_a.sql` — regenerated draft-career seed without schema DDL.
- `supabase/migrations/career_skill_graph_hardening.sql` — additive database enforcement.
- `supabase/tests/phase_a_hardening.sql` — direct SQL, long-chain, publication and RLS fixtures.
- `docs/architecture/phase-a-hardening-report.md` — this report and deployment gates.

The preexisting changes in `frontend/layouts/AdminLayout.tsx` and `frontend/layouts/PublicLayout.tsx` were preserved. Other preexisting untracked roadmap, resource, progress, content, migration and test files were preserved. No commit was created.

## 3. Database Changes

No database changes were executed. The migration adds functions, triggers, indexes and narrowly scoped profile policies to existing tables; it creates no tables and rewrites no existing IDs or rows. It must follow the existing Phase A schema and existing roadmap schema.

Graph/publication writes serialize on one transaction advisory lock. Mutations require READ COMMITTED; other isolation levels fail explicitly. Recursive SQL validates the complete prerequisite graph without REST row limits. Deferred publication checks validate final transaction state and permit draft → map → publish within a transaction. Existing invalid content remains visible to administrative health diagnostics until reviewed.

Seed generation retains 56 skill and 15 career definitions without overwriting existing records. Newly inserted careers are drafts. Prioritize Python Developer, Frontend Developer, Backend Developer, Full Stack Developer, QA Automation Engineer and Data Analyst for editorial review. Other definitions remain intact. No seed was run against a database.

## 4. Security Fixes

The migration replaces recursive profile administrator lookups with a fixed-search-path security-definer helper. Role changes require a verified administrator or a trusted database/service-role context. Ordinary self-profile updates remain allowed; self-promotion is rejected by a trigger. Security-definer RPC execution is explicitly granted only to the intended roles. Administrator routes retain session role checks. Relationship creation/deletion is scoped to either endpoint of the URL skill, preserving incoming-edge editing.

Actual RLS, grants and role integrity remain unverified until the SQL fixtures run against the target schema.

## 5. Graph Fixes

Cycle prechecks fail closed on database errors and malformed RPC results. Database triggers cover direct, seed and concurrent writes; a 1,201-node chain and opposing concurrent writes are included in the integration suite. Prerequisites remain directed; incoming prerequisites and outgoing dependents are distinguished. Symmetric associations include incoming edges and prevent reverse duplicates at the database boundary. Existing strength values and relationship IDs are preserved.

## 6. Publication Fixes

Published careers require a valid name, slug, meaningful short description and at least one published required/recommended skill. Updates validate merged persisted metadata. Database checks also prevent removing or archiving the last qualifying skill. Draft workflows remain available. Public serializers and queries explicitly exclude unpublished skill neighbors even in an elevated session.

## 7. API Fixes

Lists use validated page sizes, deterministic ordering and explicit errors rather than empty-success fallbacks. Scoped batch reads traverse records beyond Supabase's default row ceiling. Graph nodes, relationships and admin pickers expose pages. Mapping mass assignment is rejected. Malformed IDs and unrelated relationship parents are rejected. Existing APIs and canonical entities are reused.

## 8. Admin Fixes

Career and skill catalogs expose page navigation and actionable failures. Health errors cannot render as a healthy catalog. Skill detail now consumes the actual API response shape. Graph pages state that edges are limited to nodes on the current page. The existing editor and forms remain the administration system.

## 9. Public Fixes

Published career counts and relationship views filter published skills explicitly. Public skill relationships have navigation across pages. Sitemap generation adds published careers and skills and existing compatible roadmap URLs, validates slugs and fails closed on database outages. Very large catalogs require sitemap partitioning rather than silently truncating entries.

## 10. Roadmap Compatibility

Database roadmap identity takes precedence over static definitions. An inactive database record suppresses its static counterpart; absence permits static fallback. Lookup failure does not pretend the database record is absent. Roadmap IDs, node IDs, student progress storage, static progress keys and resource bindings are not rewritten. Existing roadmap/resource/progress engines remain the delivery layer. No composer, evidence, personalization, skill-gap or matching subsystem was introduced.

## 11. Tests

Phase A: 65 passed / 0 failed / 1 blocked suite (33 new hardening checks plus 32 existing foundation checks). The blocked suite covers live SQL constraints, RLS/grants/roles, long-chain traversal and concurrent writes; individual unexecuted assertions are not counted as passes.

Regression: 10 existing suites passed / 0 failed / 0 blocked. Counted checks: roadmap 25, resources 25, progress 30, expansion 48, visual redesign 19, security 36, auth/theme 29, assessment 14 and payment 27 (253 checks); the profile/store suite also passed. These existing suites include simulations and source assertions and are not live production security or payment verification.

TypeScript: PASS (`npx tsc --noEmit`). Production build: PASS (`npm run build`, 78 static pages generated). Final `git diff --check`: PASS. Hardening mocks test real service and route code but do not prove PostgreSQL behavior.

Run application checks from `frontend`:

```powershell
node scripts/test_phase_a_hardening.cjs
node scripts/run_test.cjs scripts/test_career_skill_graph_phase_a.ts
npx tsc --noEmit
npm run build
```

## 12. Production Verification

- Production schema: BLOCKED / not verified.
- RLS: BLOCKED / not verified.
- Grants: BLOCKED / not verified.
- Role integrity: BLOCKED / not verified.

`SUPABASE_SERVICE_ROLE_KEY` is unavailable. An anonymous schema request returned HTTP 401. Local PostgreSQL tooling/test database is unavailable; Docker's daemon is not running. No credentials or production records were modified.

Release procedure: provision a dedicated local Supabase-compatible database named `knowledgepaat_phase_a_test`, apply existing prerequisite schemas and the hardening migration, then set `PHASE_A_TEST_DATABASE_URL` to its localhost connection and run `node frontend/scripts/test_phase_a_database.cjs`. The runner rejects nonlocal hosts and other database names. Review migration policy compatibility and existing catalog health in staging; run the same security scenarios there. Apply the reviewed migration before deploying the application because its RPCs are required. Verify actual production schema, policies, grants, role protection, publication checks and cycle enforcement before advancing to Phase B. Do not run fixture SQL or the isolated database runner against production.

## 13. Remaining Risks

The migration's syntax and database behavior have not been executed locally; atomicity, RLS and policy compatibility require staging proof. Existing invalid published rows are reported rather than repaired. Global write serialization trades mutation throughput for integrity. Health traversal has a statement timeout and can fail on very large graphs; failures are explicit. Public/admin graph pages intentionally show a page of relationships/nodes, and batched aggregate readers reject excessive result sizes rather than truncate silently. Application deployment before migration would produce explicit RPC failures.

## 14. Phase B Readiness

NOT READY. The database migration must pass the isolated SQL/concurrency suite and staging verification, then production schema, RLS, grants and role integrity must be verified. Repository-level checks do not satisfy these database release gates.
