import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Replaces relative /og-image.png with absolute URL in OG meta tags at build time */
function ogAbsoluteUrl(): Plugin {
  return {
    name: 'og-absolute-url',
    transformIndexHtml(html, ctx) {
      const base = process.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, '');
      if (!base) return html;
      return html.replace(
        /content="\/og-image\.png"/g,
        `content="${base}/og-image.png"`
      );
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), ogAbsoluteUrl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
