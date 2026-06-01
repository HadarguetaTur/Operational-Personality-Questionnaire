/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      [
        'script-src',
        "'self'",
        "'unsafe-inline'",
        // Required by Next.js Fast Refresh / webpack HMR in dev mode only
        ...(isDev ? ["'unsafe-eval'"] : []),
        'https://challenges.cloudflare.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
      ].join(' '),
      [
        'style-src',
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
      ].join(' '),
      ["font-src", "'self'", 'https://fonts.gstatic.com', 'data:'].join(' '),
      ["img-src", "'self'", 'data:', 'https:', 'blob:'].join(' '),
      [
        'connect-src',
        "'self'",
        'https:',
        'wss:',
      ].join(' '),
      'frame-src https://challenges.cloudflare.com',
      "media-src 'self' https://res.cloudinary.com",
    ].join('; '),
  },
];

const WA_UTM = (campaign) =>
  `/?utm_source=whatsapp&utm_medium=social&utm_campaign=${campaign}`;

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/wa/gush-etzion',      destination: WA_UTM('gush-etzion'),      permanent: false },
      { source: '/wa/drushim-tekoa',    destination: WA_UTM('drushim-tekoa'),    permanent: false },
      { source: '/wa/mati-laasaskim',   destination: WA_UTM('mati-laasaskim'),   permanent: false },
      { source: '/wa/lemesira-kfar-eldad', destination: WA_UTM('lemesira-kfar-eldad'), permanent: false },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
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
