import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	main: {
		build: {
			lib: {
				entry: 'electron/main.ts',
			},
			rollupOptions: {
				external: [
					'sharp',
					'@img/sharp-darwin-arm64',
					'@img/sharp-darwin-x64',
					'@img/sharp-linux-x64',
					'@img/sharp-linux-arm64',
					'@img/sharp-win32-x64',
					'@img/sharp-win32-ia32',
					'@img/sharp-win32-arm64',
					'@img/sharp-wasm32',
				],
			},
		},
	},
	preload: {
		build: {
			lib: {
				entry: 'electron/preload.ts',
			},
		},
	},
	renderer: {
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
	},
})
