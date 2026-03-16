import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    default_locale: 'en',
    permissions: ['storage'],
  }
})
