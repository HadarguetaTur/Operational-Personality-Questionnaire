import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'Heebo', 'sans-serif'],
      },
      colors: {
        'qa-bg': 'var(--qa-bg)',
        'qa-surface': 'var(--qa-surface)',
        'qa-accent': 'var(--qa-accent)',
        'qa-border': 'var(--qa-border)',
      },
    },
  },
  plugins: [],
};

export default config;
