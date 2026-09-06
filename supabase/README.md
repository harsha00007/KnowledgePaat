# KnowledgePaat — Supabase SQL Schema & Migration Repository

This directory contains the organized PostgreSQL / Supabase SQL definitions, migrations, seed configurations, and historical setup scripts for KnowledgePaat.

## Directory Structure

```
supabase/
├── migrations/   # Active and foundational schemas & migrations for production deployment
├── seed/         # Demo data and sample configurations for testing
└── archive/      # Historical and legacy migrations from earlier project iterations
```

---

## 1. Active Migrations (`supabase/migrations/`)

These files represent the active schema architecture:

| File | Classification | Description |
|---|---|---|
| `careerlaunch_master_setup.sql` | Master Schema (Foundational) | Core production schema defining users, profiles, subscriptions, jobs, prep, mock interviews, notes, store, and orders. |
| `supabase_performance_indexes.sql` | Performance Optimization | 18 composite and single-column indexes for ultra-fast query execution. |
| `supabase_contact_inquiries_setup.sql` | Active Migration | Contact monitoring schema with soft-deletion (`deleted_at`, `deleted_by`), categories, and RLS policies. |
| `supabase_profile_validation_constraints.sql` | Data Integrity | Check constraints validating profile fields, name lengths, and emails. |
| `supabase_jobs_setup.sql` | Feature Schema | Production job schema without demo placeholder rows. |
| `supabase_notes_setup.sql` | Feature Schema | Study notes schema without placeholder dummy documents. |
| `supabase_store_and_cart_setup.sql` | Store & Commerce | Store products, cart items, order items, and student permanent purchase tables. |
| `supabase_subscription_setup.sql` | Subscription Engine | Multi-tier plan definitions, quotas, and subscription tracking. |
| `supabase_access_control_setup.sql` | Security & RBAC | Role-based access control policies for student vs admin isolation. |
| `supabase_storage_setup.sql` | Storage Buckets | Bucket creation and RLS isolation for resumes and digital downloads. |

---

## 2. Seed Scripts (`supabase/seed/`)

| File | Description |
|---|---|
| `supabase_seed_sample_test_configurations.sql` | Comprehensive sample test configurations and question mock seeds for staging/testing. |

---

## 3. Historical Archives (`supabase/archive/`)

These files represent previous iterations and incremental setup steps that were unified into the master schema. They are preserved for historical auditability and must **not** be executed against active databases:

- `gradzenx_complete_supabase_master.sql`: Master SQL schema prior to KnowledgePaat rebranding.
- Incremental feature setups: `supabase_setup.sql`, `supabase_admin_*`, `supabase_ai_*`, `supabase_interview_prep_*`, `supabase_mock_interview_*`, `supabase_rls_fix.sql`, `supabase_theme_settings_setup.sql`, etc.

---

## Safe Deployment Instructions

1. **New Environment Setup**: Execute `supabase/migrations/careerlaunch_master_setup.sql` followed by `supabase/migrations/supabase_performance_indexes.sql` and `supabase/migrations/supabase_contact_inquiries_setup.sql`.
2. **Production Updates**: Never execute archives. Review migrations individually.
