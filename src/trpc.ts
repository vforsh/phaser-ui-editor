import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../scripts/vite-plugins/api-server/vite-api-server'

const trpc = createTRPCProxyClient<AppRouter>({
	links: [
		httpBatchLink({
			url: '/api',
		}),
	],
})

type RouterInput = inferRouterInputs<AppRouter>
type RouterOutput = inferRouterOutputs<AppRouter>

export type WebFontParsed = RouterOutput['parseWebFont']

export default trpc
