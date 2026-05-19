import type { MetadataRoute } from 'next';

const SITE_URL = 'https://thesteadyone.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/onboarding/',
          '/paywall',
          '/subscribe',
          '/storage',
          '/low-credit',
          '/exit',
          '/decision',
          '/test',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
