import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('openPrefab')
		.description('Open a prefab by asset id or path')
		.option('--asset-id <assetId>', 'Prefab asset id')
		.option('--path <path>', 'Prefab path')
		.action(async (options: { assetId?: string; path?: string }) => {
			const params = options.assetId ? { assetId: options.assetId } : { path: options.path }

			if (!params.assetId && !params.path) {
				throw new Error('openPrefab requires --asset-id or --path')
			}

			const result = await ctx.rpc.request('openPrefab', params as any)
			ctx.output.printKV(result)
		})
}
