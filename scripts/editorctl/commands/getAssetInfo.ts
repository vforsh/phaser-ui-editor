import { Command } from 'commander'
import { Ctx } from '../lib/context'
import { ControlInput } from '../lib/rpc/types'

export function register(program: Command, ctx: Ctx) {
	program
		.command('getAssetInfo')
		.description('Get detailed information about an asset by id or project-relative path')
		.option('--id <id>', 'Asset id')
		.option('--path <path>', 'Asset path (project-relative)')
		.action(async (options: { id?: string; path?: string }) => {
			const params = options.id ? { id: options.id } : { path: options.path }

			if (!params.id && !params.path) {
				throw new Error('getAssetInfo requires --id or --path')
			}

			const result = await ctx.rpc.request('getAssetInfo', params as ControlInput<'getAssetInfo'>)
			ctx.output.printKV(result)
		})
}
