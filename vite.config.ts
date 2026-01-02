import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * @link https://vitejs.dev/config/
 */
export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	optimizeDeps: {
		exclude: ['lucide-react'],
	},
	define: {
		__ESM_POLYFILL__: true,
	},
	base: './',
	build: {
		rollupOptions: {
			input: {
				polyfills: 'core-js/actual/iterator',
			},
		},
	},
})
