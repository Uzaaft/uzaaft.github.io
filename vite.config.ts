import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Fully static: the terminal is client-side, so every route
			// prerenders and GitHub Pages serves the result. `strict` fails the
			// build if a route is ever added that cannot be prerendered.
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				strict: true
			})
		})
	]
});
