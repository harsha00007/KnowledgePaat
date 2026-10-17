import { getPublicCareers } from '@/lib/careerCatalog';
import { getPublicSkills } from '@/lib/skillCatalog';
import { getPublicRoadmapCards } from '@/lib/roadmap';
export const dynamic = 'force-dynamic';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://knowledgepaat.com';
  const currentDate = new Date().toISOString();

  const dynamicEntries: MetadataRoute.Sitemap = [];
  for (const [directory, fetchPage] of [['careers', getPublicCareers], ['skills', getPublicSkills]] as const) {
    for (let page = 1; ; page++) {
      const result = await fetchPage({ page, limit: 100 });
      for (const row of result.items) {
        if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) dynamicEntries.push({ url: baseUrl + '/' + directory + '/' + row.slug, lastModified: row.updated_at, changeFrequency: 'weekly', priority: 0.7 });
      }
      if (page >= result.totalPages) break;
      if (page >= 400) throw new Error('Sitemap requires partitioning.');
    }
  }
  const roadmaps = await getPublicRoadmapCards();
  for (const roadmap of roadmaps) if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(roadmap.slug)) dynamicEntries.push({ url: baseUrl + '/roadmaps/' + roadmap.slug, lastModified: roadmap.updated_at, changeFrequency: 'weekly', priority: 0.7 });
  return [
    ...dynamicEntries,
    ...['careers','skills','roadmaps'].map(directory => ({ url: baseUrl + '/' + directory, lastModified: currentDate, changeFrequency: 'weekly' as const, priority: 0.8 })),
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/interview-preparation`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/notes`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
