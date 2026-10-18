# KnowledgePaat — Phase 2 Actionable Implementation Checklist

**Target Phase:** Phase 2: Book Administration, Publication Validation & Edition Protection  
**Focus:** Database Schema, Admin UI, File Uploads, Chapter Management, Publication Validation & Content Immutability  
**Status:** COMPLETED & VERIFIED (Staging Concurrency & Atomic RPC Suite Passed, Turbopack Build 77/77 Passed)  
**Date:** October 2026  

---

## 1. Overview & Objectives

Phase 2 builds the complete content foundation for the eBook system. Administrators can create books, manage editions, author and reorder chapters, mark free sample chapters, upload book covers and private publication PDFs, validate publication against strict server-side criteria, publish editions atomically, branch draft revisions, and protect published editions against all direct mutations.

---

## 2. Ordered Implementation Tasks & Verification Status

### Task 2.1: Database Migration Setup & Atomic Stored Procedure
- [x] **Create migration script**: [`supabase/migrations/supabase_ebook_schema_setup.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/supabase_ebook_schema_setup.sql) & [`supabase/migrations/supabase_ebook_atomic_ops.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/supabase_ebook_atomic_ops.sql)
  - *Verification*: Applied and executed live against dedicated staging Supabase (`https://lzuinimbsdxnhzmjpxmr.supabase.co`).
  - *Result*: **PASS**
- [x] **Define tables**:
  - `public.ebooks` (slug, title, subtitle, author, description, category, cover_image_url, status).
  - `public.ebook_editions` (ebook_id, edition_number, version_name, pdf_storage_path, pdf_file_size_bytes, page_count, price_read_online, price_read_download, price_upgrade_pdf, is_current_edition, published_at).
  - `public.ebook_chapters` (edition_id, chapter_index, title, slug, content_body, word_count, is_free_sample, status).
  - `public.ebook_assets` (ebook_id, edition_id, asset_kind, visibility, file_name, storage_path, mime_type, byte_size, checksum_sha256).
  - `public.ebook_audit_logs` (actor_id, action, entity_type, entity_id, metadata).
  - *Result*: **PASS**
- [x] **Define partial unique index & performance indexes**:
  - `idx_ebook_editions_single_current` on `ebook_editions(ebook_id) WHERE is_current_edition = true`.
  - `idx_ebooks_slug`, `idx_ebooks_status`, `idx_ebook_editions_ebook`, `idx_ebook_chapters_edition`.
  - *Result*: **PASS**
- [x] **Row Level Security (RLS) & Policies**:
  - Public read for published books and sample chapters; admin-only writes and private PDF access.
  - *Result*: **PASS**
- [x] **Atomic Publication Stored Procedure**:
  - `publish_ebook_edition(p_book_id UUID, p_edition_id UUID, p_actor_id UUID)`: Row locking via `FOR UPDATE`, idempotency checks, demoting other editions, atomic state transitions, and audit logging.
  - *Result*: **PASS**
- [x] **Atomic Withdrawal & Concurrency Stored Procedures**:
  - `withdraw_ebook_edition(p_book_id UUID, p_edition_id UUID, p_actor_id UUID)`
  - `create_ebook_edition_revision(p_book_id UUID, p_version_name TEXT, p_clone_from_edition_id UUID, p_actor_id UUID)`
  - *Result*: **PASS**

---

### Task 2.2: Supabase Storage Buckets
- [x] **Configure `ebook-covers` bucket**:
  - Public: `true`. Allowed MIME: `image/jpeg`, `image/png`, `image/webp`. File size limit: 2 MB.
  - *Status on Staging*: **Active & Verified**.
  - *Result*: **PASS**
- [x] **Configure `ebook-pdfs` bucket**:
  - Public: `false` (Strictly Private). Allowed MIME: `application/pdf`. File size limit: 100 MB.
  - *Status on Staging*: **Active & Verified**.
  - *Result*: **PASS**

---

### Task 2.3: TypeScript Types & Validation Engines
- [x] **TypeScript definitions**: [`frontend/types/ebook.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/types/ebook.ts)
  - Types: `EBook`, `EBookEdition`, `EBookChapter`, `EBookAsset`, `EBookAuditLog`, `EBookPublicationChecklist`.
  - *Result*: **PASS** (`npx tsc --noEmit` clean: 0 errors).
- [x] **Validation & Content Protection Engines**:
  - [`frontend/lib/ebook/validation.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/validation.ts): Validates title, author, cover, chapters, free sample, private PDF, and locked prices (₹49, ₹99, ₹50).
  - [`frontend/lib/ebook/editionLock.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/editionLock.ts): Enforces edition immutability when `status === 'published'` or `published_at !== null`.
  - *Result*: **PASS**

---

### Task 2.4: Admin Authentication Security Hardening
- [x] **RBAC Verification**: [`frontend/lib/ebook/adminAuth.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/adminAuth.ts)
  - Rejects unauthenticated callers (401).
  - Rejects expired or invalid tokens (401).
  - Rejects ordinary users attempting claim elevation via `user_metadata` (403).
  - Authorizes only callers where `profiles.role === 'admin'`.
  - Supports both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and modern `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - *Result*: **PASS**

---

### Task 2.5: Admin UI & Publishing Flow
- [x] **Admin eBook List**: [`frontend/app/admin/e-books/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/admin/e-books/page.tsx)
- [x] **Book & Edition Authoring Editor**: [`frontend/app/admin/e-books/[bookId]/edit/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/admin/e-books/[bookId]/edit/page.tsx)
  - Publication badge checklist, disabled button when incomplete, "Withdraw from Sale" functionality, and revision creation.
- [x] **Next.js Production Build**:
  - Turbopack compiled 77/77 routes successfully with exit code 0.
  - *Result*: **PASS**

---

## 3. Test Cases 1 through 11 Acceptance Matrix

| # | Test Case Description | Verified Target | Status |
|---|---|---|:---:|
| 1 | Create Book Record with Valid Metadata | Dedicated Staging & Test Suite | **PASS** |
| 2 | Reject Invalid Book Metadata | Dedicated Staging & Test Suite | **PASS** |
| 3 | Create Edition with Fixed Minor-Unit Prices (₹49, ₹99, ₹50) | Dedicated Staging & Test Suite | **PASS** |
| 4 | Add and Update Chapters on Draft Edition | Dedicated Staging & Test Suite | **PASS** |
| 5 | Mark Free-Sample Chapter Belonging to Edition | Dedicated Staging & Test Suite | **PASS** |
| 6 | Upload Cover Image to Public Bucket | Dedicated Staging & Test Suite | **PASS** |
| 7 | Upload Publication PDF to Private Bucket | Dedicated Staging & Test Suite | **PASS** |
| 8 | Validate Publication Prerequisites Before Publishing | Dedicated Staging & Test Suite | **PASS** |
| 9 | Protect Published Edition Against Modifications | Dedicated Staging & Test Suite | **PASS** |
| 10 | Protect Historical Edition After Withdrawal from Sale | Dedicated Staging & Test Suite | **PASS** |
| 11 | Support Draft Revision Workflow & Chapter Cloning | Dedicated Staging & Test Suite | **PASS** |
| - | Purchaser Library & Online Reading Entitlement Access | Deferred to Phase 4 & Phase 5 | **UNVERIFIED** |
