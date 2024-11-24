import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { apiServerPlugin } from './scripts/vite-plugins/api-server/vite-api-server'

/**
 * @link https://vitejs.dev/config/
 */
export default defineConfig({
	plugins: [react(), tsconfigPaths(), apiServerPlugin],
	optimizeDeps: {
		exclude: ['lucide-react'],
	},
})
