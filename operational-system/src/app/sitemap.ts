import type { MetadataRoute } from 'next';
import { getSiteUrlString } from '@/lib/site';

/** Pattern slugs with dedicated landing copy (see landingCopy.ts). */
const LANDING_PATTERN_IDS = ['CENTRALIZED', 'FRAGILE_TEAM', 'REACTIVE', 'PROCESS_BASED'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrlString();
  const now = new Date();

  const staticPaths: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const landingPaths: MetadataRoute.Sitemap = LANDING_PATTERN_IDS.map((id) => ({
    url: `${base}/landing/${id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPaths, ...landingPaths];
}
