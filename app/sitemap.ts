import type { MetadataRoute } from 'next';
import { getAllSlugs } from '../lib/posts';

const SITE_URL = 'https://thesteadyone.com';

// Regenerate periodically so scheduled posts enter the sitemap on their date
// without waiting for a redeploy.
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/flow`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/signin`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // getAllSlugs() only returns posts whose publish date has arrived, so
  // scheduled (future-dated) posts stay out of the sitemap until they go live.
  const blogRoutes: MetadataRoute.Sitemap = getAllSlugs().map((slug) => ({
    url: `${SITE_URL}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}
