import type { MetadataRoute } from 'next';
import { getSiteUrlString } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrlString();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
