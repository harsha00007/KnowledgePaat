-- ============================================================================
-- KnowledgePaat: Deactivate Broken Seeded Resume Templates
-- Description: Sets is_active = false on unmanaged sample templates with missing /sample_templates/ paths
-- ============================================================================

UPDATE public.resume_templates
SET is_active = false
WHERE file_url IN (
  '/sample_templates/software_engineer_fresher.pdf',
  '/sample_templates/data_analyst_resume.pdf',
  '/sample_templates/business_analyst_resume.pdf',
  '/sample_templates/frontend_developer_resume.pdf',
  '/sample_templates/hr_executive_resume.pdf'
);
