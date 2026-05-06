/** @type {import('next').NextConfig} */
const QUIZ_BASE = (process.env.NEXT_PUBLIC_QUIZ_URL || 'http://localhost:5173').replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Windows + non-ASCII paths (e.g. Hebrew folder names): webpack's default
  // filesystem pack cache often fails with ENOENT rename / corrupted .pack.gz,
  // which then breaks HMR and causes 404 on /_next/static/css/app/layout.css.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
  async redirects() {
    // The questionnaire flow lives in the separate Vite app (see NEXT_PUBLIC_QUIZ_URL).
    // These rules forward any stale bookmark / email link from the old internal
    // /quiz/* routes to the live questionnaire, so historical URLs keep working
    // after the duplicate Next.js implementation was removed.
    // Vite uses HashRouter, so the route lives after the # fragment.
    return [
      { source: '/quiz', destination: `${QUIZ_BASE}/#/lead-form`, permanent: false },
      { source: '/quiz/lead-form', destination: `${QUIZ_BASE}/#/lead-form`, permanent: false },
      { source: '/quiz/diagnostic', destination: `${QUIZ_BASE}/#/lead-form`, permanent: false },
      { source: '/quiz/result/:token', destination: `${QUIZ_BASE}/#/result/:token`, permanent: false },
    ];
  },
};

module.exports = nextConfig;
