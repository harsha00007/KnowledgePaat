-- ==============================================================================
-- KNOWLEDGEPAAT E-BOOK STOREFRONT: Media Card Configuration Migration
-- Additive column addition to public.ebook_homepage_content
-- ==============================================================================

ALTER TABLE public.ebook_homepage_content
ADD COLUMN IF NOT EXISTS media_card JSONB NOT NULL DEFAULT '{
  "is_visible": true,
  "slides": [
    {
      "id": "default-slide-1",
      "type": "image",
      "media_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&auto=format&fit=crop&q=80",
      "heading": "Master Practical Software Engineering",
      "description": "Production-ready architectures, system design principles, and career-accelerating insights written by experienced practitioners.",
      "cta_label": "Explore Technical Guides",
      "cta_url": "#catalogue",
      "is_active": true,
      "order": 0,
      "alt_text": "KnowledgePaat Technical Library"
    }
  ]
}'::jsonb;

-- Comment for schema documentation
COMMENT ON COLUMN public.ebook_homepage_content.media_card IS 'Admin-managed media card configuration with carousel slides, visitor-initiated playback, and draft isolation.';
