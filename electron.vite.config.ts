import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import fs from 'node:fs'
import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'

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
			externalizeDeps: false,
			lib: {
				entry: 'electron/preload.ts',
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
		root: process.cwd(),
		plugins: [react(), tsconfigPaths()],
		optimizeDeps: {
			exclude: ['lucide-react'],
		},
		define: {
			__ESM_POLYFILL__: true,
		},
		server: {
			https: {
				key: fs.readFileSync(path.resolve(__dirname, 'certs/localhost-key.pem')),
				cert: fs.readFileSync(path.resolve(__dirname, 'certs/localhost.pem')),
			},
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
