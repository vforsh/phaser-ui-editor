import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../scripts/vite-plugins/api-server/vite-api-server'

const trpc = createTRPCProxyClient<AppRouter>({
	links: [
		httpBatchLink({
			url: '/api',
		}),
	],
})

export default trpc
