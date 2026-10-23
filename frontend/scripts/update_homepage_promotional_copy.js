const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.local')));

async function updateCopy() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ebook_homepage_content?select=*`;
  const headers = {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const getRes = await fetch(url, { headers });
  const rows = await getRes.json();

  for (const row of rows) {
    const mediaCard = row.media_card || {};
    const slides = mediaCard.slides || [];
    let updated = false;

    const newSlides = slides.map((s) => {
      if (s.heading === 'New Promotional Title' || s.heading.includes('Promotional Title')) {
        updated = true;
        return {
          ...s,
          heading: 'Master Practical Software Engineering',
          description:
            'Production-ready architectures, system design principles, and career-accelerating insights written by experienced practitioners.',
          cta_label: 'Explore Technical Guides',
          cta_url: '#catalogue',
        };
      }
      return s;
    });

    if (updated || slides.length === 0) {
      const finalSlides = newSlides.length > 0 ? newSlides : [{
        id: `slide-${Date.now()}`,
        type: 'image',
        order: 0,
        cta_url: '#catalogue',
        cta_label: 'Explore Technical Guides',
        heading: 'Master Practical Software Engineering',
        description:
          'Production-ready architectures, system design principles, and career-accelerating insights written by experienced practitioners.',
        media_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&auto=format&fit=crop&q=80',
        poster_url: null,
        alt_text: 'KnowledgePaat Technical Library',
        is_active: true,
      }];

      const patchUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ebook_homepage_content?id=eq.${row.id}`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          media_card: {
            ...mediaCard,
            slides: finalSlides,
          },
          updated_at: new Date().toISOString(),
        }),
      });

      if (!patchRes.ok) {
        console.error(`Failed to update row ${row.id}:`, await patchRes.text());
      } else {
        console.log(`Successfully updated row ${row.id} (${row.status}) with polished promotional copy!`);
      }
    }
  }
}

updateCopy();
