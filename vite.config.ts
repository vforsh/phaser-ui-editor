import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const rendererTsconfig = path.resolve(configDir, 'tsconfig.app.json')

/**
 * @link https://vitejs.dev/config/
 */
export default defineConfig({
	plugins: [react(), tsconfigPaths({ projects: [rendererTsconfig] })],
	optimizeDeps: {
		exclude: ['lucide-react'],
	},
	define: {
		__ESM_POLYFILL__: true,
	},
	server: {
		https: false,
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
