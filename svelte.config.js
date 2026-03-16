import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';

export default {
  preprocess: [
    vitePreprocess(),
    preprocess({
      scss: {
        includePaths: ['src'],
      },
    }),
  ],
};
