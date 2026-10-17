# KnowledgePaat — Career Roadmap Engine (Phase 1)
## Architecture & Technical Documentation

---

### 1. Architectural Overview

The **Career Roadmap Engine** is a core component within the KnowledgePaat platform designed to guide learners, students, and early-career job seekers from foundational fundamentals to job-ready competency.

Phase 1 provides a clean, production-grade, database-driven roadmap architecture. It intentionally establishes:
1. A relational schema for roadmaps, sequential stages (sections), competency nodes, topics, and directed prerequisite relationships.
2. Production-safe CRUD API endpoints with strict server-side validation, authorization, and cycle prevention.
3. An Admin Roadmap Builder UI (`/admin/roadmaps` and `/admin/roadmaps/[id]`) for authoring and structuring pathways.
4. A Public Roadmap Directory (`/roadmaps`) and Interactive Roadmap Detail Viewer (`/roadmaps/[slug]`).
5. A responsive vertical roadmap visualization graph with an interactive node detail drawer.

---

### 2. Database Schema

All tables utilize UUID primary keys, deterministic ordering (`sequence`), foreign key cascades, and timestamp triggers.

#### Tables:

#### `career_roadmaps`
Stores high-level career pathways (e.g., Python Developer, QA Engineer, Data Analyst).
- `id` (UUID, PK, `gen_random_uuid()`)
- `title` (TEXT, NOT NULL)
- `slug` (TEXT, UNIQUE, NOT NULL) — URL identifier
- `short_description` (TEXT, NOT NULL) — Card snippet
- `description` (TEXT, NOT NULL) — In-depth overview
- `category` (TEXT, NOT NULL) — Enum string: `Development`, `Data`, `AI`, `QA & Testing`, `DevOps & Cloud`, `Cybersecurity`, `Product`, `Design`, `Other`
- `difficulty` (TEXT, NOT NULL) — `Beginner`, `Intermediate`, `Advanced`
- `estimated_duration` (TEXT, NOT NULL) — e.g. `16 Weeks`
- `thumbnail_url` (TEXT, NULL)
- `seo_title` (TEXT, NULL)
- `seo_description` (TEXT, NULL)
- `is_active` (BOOLEAN, DEFAULT false) — Draft vs. Published
- `created_by` (UUID, FK -> `auth.users`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `career_roadmap_sections`
Represents major stages in a roadmap (e.g. 01 Foundation, 02 Python Core).
- `id` (UUID, PK)
- `roadmap_id` (UUID, FK -> `career_roadmaps(id)` ON DELETE CASCADE)
- `title` (TEXT, NOT NULL)
- `slug` (TEXT, NOT NULL)
- `description` (TEXT, NULL)
- `sequence` (INTEGER, DEFAULT 1) — Order within roadmap
- `is_required` (BOOLEAN, DEFAULT true)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- Constraint: `UNIQUE (roadmap_id, slug)`

#### `career_roadmap_nodes`
Represents an individual competency, learning skill, or milestone.
- `id` (UUID, PK)
- `section_id` (UUID, FK -> `career_roadmap_sections(id)` ON DELETE CASCADE)
- `title` (TEXT, NOT NULL)
- `slug` (TEXT, NOT NULL)
- `description` (TEXT, NULL)
- `node_type` (TEXT, DEFAULT 'TOPIC') — `SKILL`, `TOPIC`, `MILESTONE`, `CHECKPOINT`
- `difficulty` (TEXT, DEFAULT 'Beginner') — `Beginner`, `Intermediate`, `Advanced`
- `estimated_minutes` (INTEGER, DEFAULT 60)
- `sequence` (INTEGER, DEFAULT 1)
- `is_required` (BOOLEAN, DEFAULT true)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- Constraint: `UNIQUE (section_id, slug)`

#### `career_roadmap_node_relationships`
Directed edges between nodes defining prerequisites and progression.
- `id` (UUID, PK)
- `source_node_id` (UUID, FK -> `career_roadmap_nodes(id)` ON DELETE CASCADE)
- `target_node_id` (UUID, FK -> `career_roadmap_nodes(id)` ON DELETE CASCADE)
- `relationship_type` (TEXT) — `PREREQUISITE`, `NEXT`, `RECOMMENDED`, `OPTIONAL`, `ALTERNATIVE`
- `created_at` (TIMESTAMPTZ)
- Constraints:
  - `UNIQUE (source_node_id, target_node_id, relationship_type)`
  - `CHECK (source_node_id <> target_node_id)` (prevents self-reference at DB level)

#### `career_roadmap_node_topics`
Detailed syllabus concepts covered inside a learning node.
- `id` (UUID, PK)
- `node_id` (UUID, FK -> `career_roadmap_nodes(id)` ON DELETE CASCADE)
- `topic` (TEXT, NOT NULL)
- `sequence` (INTEGER, DEFAULT 1)

---

### 3. Row Level Security (RLS) Policies

All tables have RLS strictly enabled:
1. **Public Read**:
   - `career_roadmaps`: Read only where `is_active = true`.
   - `career_roadmap_sections`: Read only where `is_active = true` AND roadmap `is_active = true`.
   - `career_roadmap_nodes`: Read only where `is_active = true` AND section `is_active = true`.
   - `career_roadmap_node_relationships`: Read only where connected nodes are active.
   - `career_roadmap_node_topics`: Read only where node is active.
2. **Admin Full Access**:
   - Verified through `auth.uid()` lookup against `profiles` table where `profiles.role = 'admin'`. Full SELECT, INSERT, UPDATE, DELETE access.

---

### 4. API Endpoints

#### Public Endpoints:
- `GET /api/roadmaps`: Returns active roadmap cards for the public directory. Supports optional query filters:
  - `?search=<term>`: Matches roadmap title and short description.
  - `?category=<category>`: Filters by category.
  - `?difficulty=<difficulty>`: Filters by difficulty level.
- `GET /api/roadmaps/[slug]`: Returns complete roadmap detail (roadmap metadata, sections, nodes with topics, relationships) for the public interactive roadmap viewer. Returns `404` if the slug is inactive or not found.

#### Admin Endpoints (Require `role = 'admin'`):
- `GET /api/admin/roadmaps`: List all roadmaps including drafts.
- `POST /api/admin/roadmaps`: Create a new roadmap.
- `GET /api/admin/roadmaps/[id]`: Retrieve full roadmap structure for the builder.
- `PATCH /api/admin/roadmaps/[id]`: Update roadmap metadata and toggle `is_active`.
- `DELETE /api/admin/roadmaps/[id]`: Safe delete (rejects deletion of active roadmaps).
- `POST /api/admin/roadmaps/[id]/sections`: Add a new section.
- `PATCH /api/admin/roadmaps/[id]/sections/[sectionId]`: Update section (reorder sequence, edit title/slug, toggle active).
- `DELETE /api/admin/roadmaps/[id]/sections/[sectionId]`: Delete section.
- `POST /api/admin/roadmaps/[id]/nodes`: Add a new node (with topics).
- `PATCH /api/admin/roadmaps/[id]/nodes/[nodeId]`: Update node (title, slug, minutes, difficulty, sequence, topics).
- `DELETE /api/admin/roadmaps/[id]/nodes/[nodeId]`: Delete node (guards against removing nodes referenced as prerequisites).
- `POST /api/admin/roadmaps/[id]/relationships`: Add a relationship edge between nodes.
  - Validates source != target.
  - Validates both nodes belong to roadmap `[id]`.
  - Rejects duplicates.
  - Performs directed graph BFS cycle detection to prevent circular prerequisite deadlocks.
- `DELETE /api/admin/roadmaps/[id]/relationships/[relationshipId]`: Delete relationship edge.

---

### 5. UI & User Experience

#### Public Pages:
1. **/roadmaps**:
   - Clean Hero header: "CAREER ROADMAPS — Choose where you want to go."
   - Search bar across career titles, skills, and tools.
   - Sticky category filter bar (All Careers, Development, Data, AI, QA & Testing, DevOps & Cloud, etc.).
   - Responsive cards grid (1 col mobile, 2 col tablet, 3 col desktop).
   - Display of duration, major stages, and difficulty.

2. **/roadmaps/[slug]**:
   - Hero with full description, duration, difficulty, and "Start My Roadmap" CTA.
   - Dynamic SEO metadata (title, OpenGraph, keywords, canonical URLs).
   - Interactive Vertical Roadmap visualization (`CareerRoadmapGraph`):
     - Milestone badges for each section.
     - Connected learning nodes with type icons (`SKILL`, `TOPIC`, `MILESTONE`, `CHECKPOINT`), difficulty tags, and estimated time.
     - Clickable nodes that open the `NodeDetailDrawer`.
     - Drawer shows full topic list, prerequisite links, next steps, and informational status.
     - Fully responsive across 375px, 390px, 414px, 768px, 1024px, 1280px, and 1440px with no horizontal overflow.

#### Admin Pages:
1. **/admin/roadmaps**:
   - Complete directory of roadmaps with status badges (Active/Draft).
   - Real-time search, category, and status filters.
   - "+ Create Roadmap" modal with auto-slug generation.
   - Edit metadata modal.
   - Instant toggle for draft/publish status.
   - Integrated into the existing `AdminLayout` navigation under "Career Roadmaps".

2. **/admin/roadmaps/[id]**:
   - Roadmap Structure Builder.
   - Stage/Section management (add, edit, delete, reorder up/down).
   - Learning node management (add, edit, delete, reorder up/down, tag topics).
   - Relationship manager tab (connect source to target with PREREQUISITE, NEXT, RECOMMENDED, OPTIONAL, ALTERNATIVE).

---

### 6. Intentionally Excluded from Phase 1

To keep Phase 1 stable, production-safe, and isolated, the following systems are **NOT** implemented in this phase:
- Student progress tracking and node completion states
- AI coaching and personalized curriculum generation
- Practice engines and coding sandboxes
- MCQ and subjective assessments
- Project submissions and reviews
- Student career readiness scoring and skill evidence
- Job matching and job recommendations
- Resume integration
- Mock interview integration
- Payment and subscription gating

These will attach cleanly to the node and roadmap IDs in subsequent phases.

---

# KnowledgePaat — Career Roadmap Resource Engine (Phase 2)
## Architecture & Technical Documentation

---

### 1. Phase 2 Architectural Overview

While Phase 1 answers **"What should I learn?"** by establishing roadmaps, sections, nodes, and prerequisites, Phase 2 answers **"Where should I learn it?"**.

The **Resource Engine** establishes a centralized, reusable **Resource Library** and links curated learning content to specific roadmap nodes.

#### Core Flow:
```
Roadmap
   ↓
Section
   ↓
Node
   ↓
Resources (Central Library)
   ↓
⭐ Recommended Resource
   ↓
Student opens resource (external / internal)
```

#### Reusability Principle:
A resource is created **once** in `career_resources` and can be attached to nodes across multiple different roadmaps (e.g. *SQL Complete Course* attached to Data Analyst, Python Developer, QA Engineer, and Business Analyst roadmaps) without duplicating resource records.

---

### 2. Phase 2 Database Schema

New database tables introduced in `supabase/migrations/career_roadmap_resource_engine_phase2.sql`:

#### `career_resources`
The centralized catalog of learning resources.
- `id` (UUID, PK, `gen_random_uuid()`)
- `title` (TEXT, NOT NULL)
- `description` (TEXT, NOT NULL DEFAULT '')
- `resource_type` (TEXT, NOT NULL) — Supported types:
  - `YOUTUBE`
  - `ARTICLE`
  - `DOCUMENTATION`
  - `UDEMY`
  - `KNOWLEDGEPAAT_COURSE`
  - `LIVE_COURSE`
  - `BOOK`
  - `PROJECT`
  - `PRACTICE`
- `provider` (TEXT, NOT NULL) — e.g. "freeCodeCamp", "Python Docs", "Udemy"
- `url` (TEXT, NOT NULL) — Canonical URL (enforces `http:` or `https:`)
- `thumbnail_url` (TEXT, NULL)
- `duration_minutes` (INTEGER, NULL)
- `difficulty` (TEXT, NOT NULL DEFAULT 'Beginner') — `Beginner`, `Intermediate`, `Advanced`
- `category` (TEXT, NOT NULL DEFAULT 'Development')
- `is_free` (BOOLEAN, NOT NULL DEFAULT true)
- `price` (NUMERIC(10, 2), NULL)
- `currency` (TEXT, NOT NULL DEFAULT 'INR')
- `language` (TEXT, NOT NULL DEFAULT 'English')
- `instructor` (TEXT, NULL)
- `rating` (NUMERIC(3, 2), NULL) — Between 0.00 and 5.00
- `is_recommended` (BOOLEAN, NOT NULL DEFAULT false)
- `priority` (INTEGER, NOT NULL DEFAULT 1)
- `is_active` (BOOLEAN, NOT NULL DEFAULT true)
- `created_by` (UUID, FK -> `auth.users`, NULL)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- Constraints & Indexes:
  - `UNIQUE (url)` — Prevents duplicate resource records by canonical URL
  - `CHECK (rating >= 0 AND rating <= 5)`
  - `CHECK (duration_minutes >= 0)`
  - `CHECK (price IS NULL OR price >= 0)`
  - Indexes on `is_active`, `resource_type`, `category`, `difficulty`, `is_free`

#### `career_roadmap_node_resources`
Many-to-many junction linking roadmap nodes to library resources.
- `id` (UUID, PK, `gen_random_uuid()`)
- `node_id` (UUID, FK -> `career_roadmap_nodes(id)` ON DELETE CASCADE)
- `resource_id` (UUID, FK -> `career_resources(id)` ON DELETE CASCADE)
- `priority` (INTEGER, NOT NULL DEFAULT 1) — Lower number = higher priority
- `is_recommended` (BOOLEAN, NOT NULL DEFAULT false) — Node-specific primary recommendation flag
- `created_at` (TIMESTAMPTZ)
- Constraints & Indexes:
  - `UNIQUE (node_id, resource_id)` — Prevents attaching the same resource twice to a single node
  - Indexes on `node_id`, `resource_id`, and `(node_id, priority)`

---

### 3. Row Level Security (RLS) Policies

Both Phase 2 tables have Row Level Security enabled:

1. **Public Read**:
   - `career_resources`: Visible to all users where `is_active = true`.
   - `career_roadmap_node_resources`: Visible to public where the linked resource is active, the node is active, the section is active, and the parent roadmap is active (`is_active = true`).
2. **Admin Full Access**:
   - Authorized admin users (`profiles.role = 'admin'`) have full `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access.
3. **Student / Anonymous Protection**:
   - Non-admin users cannot create, modify, attach, detach, or delete resources (enforced both at RLS level and in Next.js route handlers via `isAdminUser()`).

---

### 4. API Endpoints

#### Public Endpoints:
- `GET /api/resources`: List active library resources with support for query filters (`?search=`, `?type=`, `?difficulty=`, `?is_free=`, `?category=`).
- `GET /api/resources/[id]`: Retrieve single active resource.
- `GET /api/roadmaps/[slug]`: Additively extended to attach active `resources` array to each node within sections, populated via a single batch join (`getNodesResourcesMap`) to eliminate N+1 queries.

#### Admin Endpoints (Require `role = 'admin'`):
- `GET /api/admin/resources`: List all library resources (active and inactive) with search and filters.
- `POST /api/admin/resources`: Create a resource in the library with URL canonicalization.
- `GET /api/admin/resources/[id]`: Retrieve single resource detail for editing.
- `PATCH /api/admin/resources/[id]`: Update resource metadata or toggle `is_active`.
- `DELETE /api/admin/resources/[id]`: Safe delete. Rejects deletion with HTTP 400 if attached to roadmap nodes, recommending deactivation instead.
- `POST /api/admin/roadmaps/[id]/nodes/[nodeId]/resources`:
  - Attach existing resource (`resource_id`) OR create new & attach (`new_resource`).
  - Automatically unsets other recommended resources on that node if `is_recommended = true`.
  - Rejects cross-roadmap node attachment with HTTP 400.
  - Rejects duplicate attachment with HTTP 409.
- `PATCH /api/admin/roadmaps/[id]/nodes/[nodeId]/resources/[resourceId]`: Update node attachment priority and recommendation flag.
- `DELETE /api/admin/roadmaps/[id]/nodes/[nodeId]/resources/[resourceId]`: Detach resource from node. **Crucial Safety Guarantee**: Deletes only the junction record; the resource remains untouched in the central library.

---

### 5. UI Components & Pages

1. **/admin/resources**:
   - Complete Admin Resource Library dashboard.
   - Search across title, provider, and category.
   - Filter pills for Resource Type, Difficulty, Pricing, and Active Status.
   - "Add Resource" modal with client-side & server-side validation.
   - Resource cards with inline status badges, Edit modal, and Safe Deactivation/Deletion confirmation.

2. **/admin/roadmaps/[id]** (Extended Node Editor):
   - Node cards display resource count chip and ⭐ Recommended badge.
   - Dedicated "Manage Resources" action modal per node with three sub-tabs:
     - **Attached Resources**: View attached resources, reorder priorities with Move Up/Down buttons, toggle ⭐ Recommended, and detach resources safely.
     - **+ Attach Existing**: Search central library resources with one-click attach.
     - **+ Create & Attach New**: Create a resource from inside the roadmap builder that saves to the central library and immediately links to the node.

3. **/roadmaps/[slug]** (`NodeDetailDrawer`):
   - Opens when any roadmap node is clicked.
   - Displays ⭐ Recommended Resource card prominently with type icon, provider, duration, difficulty, and safe external link (`target="_blank" rel="noopener noreferrer"`).
   - "More Resources" list with badges and direct links.
   - Inactive resources automatically filtered out.

---

### 6. Security & Safe Practices

- **URL Normalization & Sanitization**:
  - Enforces `http:` or `https:`.
  - Rejects `javascript:`, `data:`, `file:`, and malformed strings.
  - Normalizes tracking parameters (`utm_*`, `ref`) to prevent accidental duplicate entries.
- **Description Safety**:
  - Descriptions are treated strictly as plain text (no unescaped HTML or `dangerouslySetInnerHTML`).
- **No Third-Party Scraping or Video Hosting**:
  - Only stores metadata and canonical links.
  - Respects third-party platforms (YouTube, Udemy, external courses); content is never downloaded or pirated.
- **No Payment Gating in Phase 2**:
  - Paid resources store optional `price` and `currency` for informational display only; students follow external links directly.

---

### 7. Intentionally Excluded from Phase 2

To maintain stability and strict scope isolation, the following features belong to later phases and are **NOT** implemented in Phase 2:
- Student resource progress tracking (`completed_resource`, `watch_percentage`, `learning_streak`)
- Coding practice engines and sandboxes
- Quizzes and skill assessments
- Project submissions and reviews
- Skill evidence and proof-of-work matrix
- Job matching and job boards
- AI curriculum personalization or AI ranking
- Course checkout, payments, and subscriptions

