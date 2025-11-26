// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://uzaaft.me',
  integrations: [
    markdoc(),
    sitemap()
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
