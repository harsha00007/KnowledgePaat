# KnowledgePaat — Career & Skill Graph Foundation (Phase A)
## Architectural Specification & Integration Blueprint

---

### 1. Purpose & Strategic Overview

KnowledgePaat's Roadmap Intelligence vision separates curriculum into a clean, reusable knowledge layer:

```
                    KNOWLEDGEPAAT
                         │
               Career Intelligence
                         │
               ┌─────────┴─────────┐
               │                   │
            Careers              Skills
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                    Relationships        Resources
                         │
                   Roadmaps (Phase B)
                         │
                 Personalized (Phase C)
                         │
                  Skill Gaps (Phase D)
```

**Phase A** creates the foundational, reusable knowledge layer:
1. **Career Catalog** (`career_catalog`): Canonical tech professions, requirements, and metadata.
2. **Skill Catalog** (`skill_catalog`): Global, reusable technology skills (languages, frameworks, tools, concepts, practices).
3. **Career-Skill Mappings** (`career_skill_map`): Many-to-many relationship defining which skills belong to which careers, with explicit importance tiers (`required`, `recommended`, `optional`) and target proficiencies.
4. **Skill Dependency Graph** (`skill_relationships`): Directed graph defining prerequisite requirements, cross-domain affinities, and complementary toolings with **server-enforced cycle rejection**.

---

### 2. Database Model

The Phase A database schema is defined in [`supabase/migrations/career_skill_graph_phase_a.sql`](file:///c:/Users/ADMIN/Documents/CareerLaunch2/supabase/migrations/career_skill_graph_phase_a.sql) and [`supabase/migrations/career_skill_graph_seed_phase_a.sql`](file:///c:/Users/ADMIN/Documents/CareerLaunch2/supabase/migrations/career_skill_graph_seed_phase_a.sql).

```
┌──────────────────────┐         ┌─────────────────────────┐         ┌──────────────────────┐
│    career_catalog    │1       *│    career_skill_map     │*       1│    skill_catalog     │
├──────────────────────┤─────────├─────────────────────────┤─────────├──────────────────────┤
│ id (PK, UUID)        │         │ id (PK, UUID)           │         │ id (PK, UUID)        │
│ slug (UNIQUE)        │         │ career_id (FK, CASCADE) │         │ slug (UNIQUE)        │
│ name                 │         │ skill_id (FK, RESTRICT) │         │ name                 │
│ short_description    │         │ importance              │         │ short_description    │
│ description          │         │ proficiency_target      │         │ description          │
│ category             │         │ display_order           │         │ category             │
│ difficulty           │         │ is_core                 │         │ skill_type           │
│ estimated_months     │         │ notes                   │         │ difficulty           │
│ status               │         │ created_at, updated_at  │         │ status               │
│ display_order        │         └─────────────────────────┘         │ display_order        │
│ is_featured          │                                             │ is_featured          │
│ created_at           │                                             │ created_at           │
│ updated_at           │                                             │ updated_at           │
└──────────────────────┘                                             └──────────┬───────────┘
                                                                                │ 1
                                                                                │
                                                                                │ *
                                                                 ┌──────────────┴──────────────┐
                                                                 │     skill_relationships     │
                                                                 ├─────────────────────────────┤
                                                                 │ id (PK, UUID)               │
                                                                 │ source_skill_id (FK)        │
                                                                 │ target_skill_id (FK)        │
                                                                 │ relationship_type           │
                                                                 │ strength                    │
                                                                 │ notes                       │
                                                                 │ created_at, updated_at      │
                                                                 └─────────────────────────────┘
```

#### Referential Integrity & Deletion Rules
- `career_skill_map.career_id` cascade-deletes if a career is removed.
- `career_skill_map.skill_id` enforces `ON DELETE RESTRICT` to guarantee a shared global skill cannot be accidentally deleted if active careers depend on it.
- `skill_relationships` enforces `CONSTRAINT chk_no_self_skill_relationship CHECK (source_skill_id <> target_skill_id)` and uniqueness over `(source_skill_id, target_skill_id, relationship_type)`.

---

### 3. Career Model

A career record represents an industry role (e.g. *Python Developer*, *QA Automation Engineer*, *Data Analyst*).

- **Status**: `draft | published | archived`
  - Only `published` careers are returned to public directory APIs and student views.
- **Difficulty**: `beginner | intermediate | advanced`
- **Category**: `software_development | data | ai_ml | qa_testing | devops_cloud | cybersecurity | design | product | business | other`
- **Estimated Months**: Target duration expected for a learner to achieve job readiness.
- **Publish Readiness Rules**:
  A career can only be published if it has at least one `required` or `recommended` skill mapped. Attempting to publish an unmapped career triggers an admin validation blocker.

---

### 4. Skill Model

Skills are modeled as **globally reusable entities**:
- One canonical record for `Python`, referenced by Python Developer, Data Analyst, QA Automation Engineer, and AI Engineer.
- **Skill Types**: `language | framework | library | database | tool | platform | concept | soft_skill | domain | practice | architecture | other`
- **Difficulty**: `beginner | intermediate | advanced`
- **Status**: `draft | published | archived`

---

### 5. Career-Skill Mapping (Many-to-Many)

Mapped via `career_skill_map`:
- **Importance**:
  - `required`: Core competency; indispensable for hiring qualification.
  - `recommended`: High industry demand; significantly strengthens employability.
  - `optional`: Specialization or edge tool; provides distinction.
- **Proficiency Target**: `beginner | working | proficient | advanced`
- **Display Order**: Controls visual sequencing within each importance tier.

---

### 6. Skill Relationships & Graph Safety

Defined via `skill_relationships`:
- **Relationship Types**:
  - `prerequisite`: Direct learning dependency (Source must be learned before Target).
  - `builds_on`: Pedagogical progression without strict blocking.
  - `related`: Conceptual affinity across tech stacks.
  - `commonly_used_with`: Ecosystem companion (e.g., FastAPI + Docker).
  - `alternative`: Substitute tool (e.g., Selenium vs. Playwright).

#### Server-Side BFS Cycle Detection
Cycles in `prerequisite` relationships are strictly blocked by `wouldCreatePrerequisiteCycle` in [`frontend/lib/skillGraph.ts`](file:///c:/Users/ADMIN/Documents/CareerLaunch2/frontend/lib/skillGraph.ts):
- When an edge `Source -> Target` is proposed with `relationship_type = 'prerequisite'`, the algorithm executes a Breadth-First Search starting from `Target`.
- If `Source` is reachable from `Target`, a directed cycle would be created. The API aborts the transaction with `HTTP 400 Bad Request` and returns an explicit message detailing the cyclic dependency.
- Cycles are permitted for symmetric/associative types like `related` and `commonly_used_with`.

---

### 7. API Architecture

#### Public Endpoints (Cached, Public-Only, Published Content)
- `GET /api/careers`: Paginated list of published careers with search & category filters.
- `GET /api/careers/[slug]`: Single published career.
- `GET /api/careers/[slug]/skills`: Core, recommended, and optional skills for a career.
- `GET /api/skills`: Paginated list of published skills with type and category filters.
- `GET /api/skills/[slug]`: Single published skill.
- `GET /api/skills/[slug]/relationships`: Prerequisite graph and related ecosystem.
- `GET /api/skills/[slug]/careers`: Careers that require or recommend this skill.

#### Admin Endpoints (Session Authenticated, Role-Protected)
- `GET/POST /api/admin/careers`: List and create career tracks.
- `GET/PATCH /api/admin/careers/[id]`: Retrieve and update career metadata.
- `GET /api/admin/careers/[id]/quality`: Evaluate publication readiness score and blockers.
- `GET/POST /api/admin/careers/[id]/skills`: Query and attach skills to career.
- `PATCH/DELETE /api/admin/careers/[id]/skills/[skillId]`: Update importance or detach skill.
- `GET /api/admin/careers/health-check`: Global catalog integrity audit.
- `GET/POST /api/admin/skills`: List and create skills.
- `GET/PATCH /api/admin/skills/[id]`: Retrieve and update skill metadata.
- `GET/POST /api/admin/skills/[id]/relationships`: Query and establish relationships with cycle check.
- `DELETE /api/admin/skills/[id]/relationships/[relId]`: Detach relationship.
- `GET /api/admin/skills/graph`: Top-level graph nodes & edges for graph visualization.

---

### 8. Admin Management Screens

- `/admin/careers`: Career catalog directory with search, status filters, create modal, and global health-check trigger.
- `/admin/careers/[id]`: Career editor, publish readiness audit, mapped skills partitioned by importance, skill attachment modal.
- `/admin/skills`: Skill catalog directory with category, type, and difficulty filters.
- `/admin/skills/[id]`: Skill metadata editor, "Used in Careers" list, and relationship manager with cycle detection alerts.
- `/admin/skills/graph`: Graph inspector featuring root/foundational skill identification, bidirectional relationship inspection, and selected node drill-down.

---

### 9. Public Screens & SEO

- `/careers`: Public catalog featuring domain filters, search, estimated months, and skill counts.
- `/careers/[slug]`: Public career detail page with core required, recommended, and optional skill cards, target proficiencies, and "Build My Career Roadmap" CTA.
- `/skills`: Public skill catalog directory with technology badges.
- `/skills/[slug]`: Public skill detail page detailing prerequisites, dependent skills, cross-domain ecosystem, and connected Phase 2 learning resources.

---

### 10. Security & Row Level Security (RLS)

1. **Public & Students**:
   - `SELECT` allowed on `career_catalog`, `skill_catalog`, `career_skill_map`, and `skill_relationships` **only where `status = 'published'`**.
   - Draft and archived entries are completely invisible at the database RLS layer.
2. **Admins**:
   - Full CRUD across all 4 tables guarded by `profiles.role = 'admin'` via `auth.uid()`.
3. **No Service Keys in Client Code**:
   - Client code only calls safe route handlers using session cookies.

---

### 11. Health Check & Integrity Auditor

Accessible to admins at `/api/admin/careers/health-check`:
- Detects duplicate slugs.
- Detects orphan `career_skill_map` records.
- Detects orphan `skill_relationships`.
- Detects cyclic prerequisite chains.
- Detects published careers with zero mapped skills.
- Detects archived skills attached to published careers.

---

### 12. Integration with Future Phases

#### Phase B: Roadmap Composer
The Roadmap Composer will synthesize sequential, milestone-driven roadmaps directly from the Career-Skill graph:
```
Career Catalog Item
       ↓
Roadmap Version (Phase B)
       ↓
Roadmap Stages / Sections
       ↓
Mapped Skills & Topics
```
Because skills and their prerequisite relationships are already defined in Phase A, the Roadmap Composer will automatically infer stage sequencing from topological sorts of prerequisite edges.

#### Phase D: Skill Gap Engine
A learner's verified skills can be compared against `career_skill_map` entries for any target career:
```
Missing Skills = Career Required Skills - Learner Verified Skills
```
Prerequisite chains will identify what must be learned first to close each gap.

---

### 13. What Phase A Does NOT Implement (Strict Non-Goals)

To preserve system boundaries and maintain production stability, Phase A intentionally **omits**:
- ❌ Automatic Roadmap Generation / Composer (Deferred to Phase B)
- ❌ Personalized student roadmap customization (Deferred to Phase C)
- ❌ Skill Gap Calculation / Benchmark tests (Deferred to Phase D)
- ❌ Changes to the existing Phase 1 Roadmap Engine or database tables (`career_roadmaps`, `career_roadmap_sections`, `career_roadmap_nodes`, `career_roadmap_node_relationships`)
- ❌ Changes to the Phase 2 Resource Engine tables (`career_resources`, `career_roadmap_node_resources`)
- ❌ Changes to Phase 3 student progress tracking (`user_roadmap_progress`)
- ❌ Changes to authentication, subscriptions, payments, or interview preparation
