import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const rendererRoot = path.resolve(configDir, 'src/renderer')
const rendererTsconfig = path.resolve(configDir, 'tsconfig.app.json')

export default defineConfig({
	main: {
		resolve: {
			conditions: ['node', 'require'],
			alias: {
				minimatch: path.resolve('node_modules/minimatch/dist/commonjs/index.js'),
			},
		},
		build: {
			externalizeDeps: false,
			commonjsOptions: {
				requireReturnsDefault: 'namespace',
			},
			lib: {
				// Note: output stays as out/main/index.js (package.json "main") regardless of entry filename.
				entry: path.join(rendererRoot, '../main/main.ts'),
			},
			rollupOptions: {
				output: {
					entryFileNames: 'index.js',
				},
				external: [
					'ws',
					'bufferutil',
					'utf-8-validate',
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
			externalizeDeps: false,
			lib: {
				entry: path.join(rendererRoot, '../preload/preload.ts'),
				formats: ['cjs'],
			},
			rollupOptions: {
				output: {
					entryFileNames: 'preload.cjs',
					format: 'cjs',
				},
			},
		},
	},
	renderer: {
		root: rendererRoot,
		plugins: [react(), tsconfigPaths({ projects: [rendererTsconfig] })],
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
