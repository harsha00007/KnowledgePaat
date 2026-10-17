# Phase B Roadmap Composer

## Purpose and architecture

The composer deterministically turns one published canonical career into a draft in the existing roadmap engine. It reads `career_catalog → career_skill_map → skill_catalog → skill_relationships` and writes `career_roadmaps → career_roadmap_sections → career_roadmap_nodes`, directed `career_roadmap_node_relationships` and existing resource attachments. Skills remain canonical concepts; generated nodes are curriculum instances. Topics are not invented. The existing builder can add curated topics, estimates, resources and milestones before publication. Existing resource and learner progress engines remain the delivery systems.

No learner profile, assessment, interview, resume, job, AI or personalization data is used.

## Inputs and APIs

Admin-only POST endpoints:

- `/api/admin/roadmaps/compose/preview`: `{ careerId, title?, difficulty?, targetDuration? }`
- `/api/admin/roadmaps/compose`: the same fields plus the preview's `fingerprint`.

`careerId` must be a UUID. Title is trimmed and limited to 3–200 characters; duration to 1–100; difficulty uses existing `Beginner`, `Intermediate`, `Advanced` values. Unexpected keys, including `roadmapId`, `admin` and `user_id`, are rejected. Phase B has no public composer API and no regeneration endpoint. The UI initially exposes career selection only; optional settings are supported by the API.

Preview returns the career, metadata, ordered canonical IDs, existing curriculum sections, node descriptions, requirement/proficiency/core metadata, prerequisite relationships, resources, counts and warnings. Its PostgreSQL snapshot function is STABLE and performs no inserts, updates, deletes or advisory locking. Generation returns roadmap ID, slug, title, section/node/resource counts, active state, created/existing status and warnings.

## Algorithm and prerequisite closure

The existing skill graph service is extended with `getCareerCompositionSnapshot`. A single scoped RPC reads the selected career and all its mappings, then follows **incoming prerequisite edges**, where source is the prerequisite and target is its dependent. SQL recursive UNION deduplicates shared prerequisites and terminates even for corrupt cycles. No unrelated skills or associative `related`/`builds_on` edges are included.

All selected mappings, including optional ones, must reference published skills. The complete prerequisite closure must be published. Missing/invalid endpoints, malformed slugs, unpublished requirements/prerequisites and careers without required/recommended mappings fail explicitly. No invalid requirement is silently omitted. The snapshot includes relevant curated resources and a deterministic MD5 fingerprint of its JSONB representation. The fingerprint detects stale previews; it is not an authentication token or cryptographic authorization mechanism.

The pure TypeScript planner validates the snapshot and runs Kahn's topological sort. Available nodes sort by:

1. Whether they are prerequisites of another included skill (foundation before terminal skills).
2. Career mapping display order; unmapped prerequisites sort after mapped nodes within that stage.
3. Mapping `is_core`, descending.
4. Skill display order.
5. Skill name, Unicode code-point order matching database `COLLATE "C"`.
6. Skill UUID.

No clock, random value or AI affects curriculum ordering. A cycle leaves no valid complete ordering and causes `SKILL_GRAPH_CYCLE`. Required/recommended/core requirements and their prerequisite closure have `is_required=true`; exclusively optional branches remain optional. Shared prerequisites appear once and become required if any required branch needs them.

## Section and node generation

The existing content uses foundation/core learning stages. The composer emits at most two nonempty stages: `Foundation` for included skills with outgoing prerequisites and `Core Skills` for terminal skills. Foundation nodes precede terminal nodes without violating prerequisites: a terminal skill cannot be a prerequisite of a foundation node. Optional terminal skills are marked optional, rather than given a new node type or taxonomy.

Every skill produces one existing `SKILL` node with canonical slug/title/description, capitalized existing difficulty, sequence, active state and required flag. Career target proficiency is included in the curriculum description and preview. Learning times use the existing schema's 30-minute default because the builder requires positive values. Preview/generation warnings explicitly require estimate review; this default is not a derived learning-time claim. Roadmap duration derives from existing career months or an explicit admin option. The category translates canonical categories to existing roadmap categories and defaults to `Other` for unknown categories. A new roadmap has `is_active=false`; its sections/nodes are active but cannot be publicly read until the parent roadmap is published through the existing workflow.

Global prerequisite edges become curriculum `PREREQUISITE` edges using the generated node UUIDs, preserving source/target semantics. No duplicate edges or resource records are created.

## Resource attachment

There is no canonical skill-to-resource association table. Phase B therefore reuses established curriculum curation: active existing `SKILL` nodes with **exactly the canonical skill slug**, inside active sections and active roadmaps. It does not guess from similar titles, search the web, scrape URLs or create resources. Slug matching is a deliberately conservative convention and still requires admin review.

Only active `career_resources` are eligible. For repeated curation of the same resource/skill pair, select one actual attachment by recommendation, priority, then attachment UUID, preserving that attachment's priority and flag together. Rank distinct resources by recommendation, priority, difficulty compatibility, title and UUID; attach at most five per skill. Snapshot selection is one batched SQL query over relevant skill IDs, not one request per node. Missing resources produce a preview warning; a node may have no resource.

Existing resource rendering still uses `getNodesResourcesMap`. Its reads, and roadmap/progress detail reads, were narrowly batched to prevent the existing REST 1,000-row ceiling and oversized ID lists from truncating large generated curricula. Each ID batch is at most 100, row pages are 200, and at most five batches run together. Storage, identity, progress writes and scoring were not changed.

## Idempotency and identity

The additive migration adds nullable `composer_career_id` and `composer_version` to the existing roadmap table. Existing manually authored rows remain null. A partial unique index reserves one generated roadmap for each career/version pair. The source career FK uses ON DELETE SET NULL, so deleting canonical data does not delete existing delivery curricula or learner progress. Version 1 is the only supported composer version.

The initial slug is `<career-slug>-composed-v1`. A manual roadmap occupying it causes `ROADMAP_ALREADY_EXISTS`; it is never adopted or overwritten. Career UUID/version identifies subsequent calls even if an administrator later edits the roadmap or canonical career slug. Repeat generation returns the existing roadmap, including published or manually edited content, **unchanged**. Options, changed graph content and a new fingerprint do not rewrite it. If the career itself is unpublished, generation is rejected; its existing delivery roadmap remains untouched.

There is no destructive regeneration. Node UUIDs are created once and never reassigned by this composer. Existing `career_user_roadmap_progress` keys remain `(user_id,node_id)` and survive repeated composition. Newly generated drafts start without student progress. Explicit manual edits/deletes remain governed by existing administration APIs.

## Transactions

`phase_b_compose_roadmap` is a single PostgreSQL transaction boundary. It derives the authenticated admin, validates options, requires READ COMMITTED, acquires Phase A's graph/publication transaction lock and locks existing curation/delivery tables while reading and creating the hierarchy. It recomputes the current scoped snapshot and rejects a stale fingerprint before writing.

Session-local temporary work sets validate the exact supplied order against current canonical priorities and indegrees. These are validation workspaces dropped at transaction end, not persistent entities or new roadmap systems. The database derives curriculum content, required flags, nodes, edges and attachments from its snapshot rather than trusting arbitrary client node payloads. Replayed topological selection is defense at the database mutation boundary; the existing graph service remains the application graph reader.

Roadmap, sections, nodes, relationships and attachments either all commit or none do. Failure-trigger SQL tests confirm rollback after hierarchy creation begins. Concurrent calls serialize; one creates the roadmap and the other returns the same identity. Lock/statement timeouts and failed SQL statements are explicit failures, not partial success. Global serialization favors correctness over generation throughput.

## Security and RLS

The API uses the existing Supabase session client, `auth.getUser()` and persisted profile role. It does not trust a browser identity or admin flag. Anonymous requests receive 401; students receive 403. Both RPCs independently check `auth.uid()` and the hardened `phase_a_is_admin()` helper.

Both Phase B RPCs are **SECURITY INVOKER**, fixed empty search path. RLS remains enabled and unchanged. PUBLIC/anonymous execution is revoked; `authenticated` has explicit execution, with role checks inside each function. No service-role bypass or broad security-definer composer is introduced. The deployed authenticated role must retain the existing table privileges needed by the roadmap builder; local fixture grants do not prove target privileges.

Existing structured logging records generation started/completed/failed, career and roadmap IDs, counts and elapsed time. Public errors contain known codes and safe messages; unknown database failures become `ROADMAP_GENERATION_FAILED` without SQL details. Logs contain no tokens, passwords or keys.

## Error model

Supported codes: `CAREER_NOT_FOUND`, `CAREER_NOT_PUBLISHED`, `NO_PUBLISHED_REQUIREMENTS`, `UNPUBLISHED_REQUIRED_SKILL`, `UNPUBLISHED_PREREQUISITE`, `SKILL_GRAPH_INVALID`, `SKILL_GRAPH_CYCLE`, `GRAPH_LIMIT_EXCEEDED`, `PREVIEW_STALE`, `ROADMAP_ALREADY_EXISTS`, `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `ROADMAP_GENERATION_FAILED`.

Missing careers return 404; invalid composition/input 422 (malformed JSON 400); stale preview or slug conflict 409; session/role failures 401/403; unknown database unavailability 503. Errors never return 200 with an empty roadmap.

## Testing and deployment

Application checks, from `frontend`:

```powershell
node scripts/test_roadmap_composer.cjs
node scripts/test_composer_delivery.cjs
node scripts/test_phase_a_hardening.cjs
node scripts/run_test.cjs scripts/test_career_skill_graph_phase_a.ts
npx tsc --noEmit
npm run build
```

The guarded `test_roadmap_composer_database.cjs` requires `PHASE_A_TEST_DATABASE_URL` pointing to localhost and exactly `knowledgepaat_phase_a_test`, plus `psql` on PATH. It rejects remote hosts and other databases. Apply the reviewed existing profile/auth prerequisites, Roadmap Phase 1, Resource Phase 2, Progress Phase 3, Phase A and Phase A hardening schemas, then `roadmap_composer_phase_b.sql` to that dedicated database. Never point fixtures or the runner at production.

SQL fixtures roll back. The scale/concurrency runner creates uniquely scoped local fixtures and removes them in finally blocks. Tests compare the real TypeScript planner with actual SQL snapshots/persistence for 1, 5, 50 and 1,201 skills. Direct SQL verifies authorization, publication errors, duplicate identity, manual slug conflict, optional flags, curated resource identity, cycle rejection, node/progress stability and mid-insert rollback. Delivery-reader mocks enforce REST limits while verifying complete 1,201-node results.

Local PostgreSQL testing uses a minimal Supabase auth scaffold, not GoTrue/PostgREST. Staging must verify actual deployed policies, grants, auth sessions and the full admin/public workflow. Apply the reviewed additive migration before deploying the application. No production migration or data mutation was performed in this task.

## Limitations and future extension points

- Maximum composition: 5,000 skills, 20,000 prerequisite edges, five curated resources per skill. Larger closures fail explicitly.
- No regeneration, learner personalization, arbitrary scope/version selection, AI, assessments or job matching.
- No automatically invented topics, milestones or duration estimates.
- Exact-slug curated resource matching can yield zero attachments; admin review remains mandatory.
- Actual Supabase staging/API integration and production migration verification remain outstanding.
- The broad regression run found existing company-entitlement and sidebar failures and two environment-dependent integration suites. See the final report; unrelated systems were preserved.

Future phases can add explicit curated skill/resource associations and reviewed semantic regeneration only after their identity/progress contract is designed. They should consume this composer, canonical knowledge, existing delivery entities and progress rather than duplicating them.
