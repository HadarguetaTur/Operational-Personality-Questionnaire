/** @type {import('next').NextConfig} */
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
};

module.exports = nextConfig;
