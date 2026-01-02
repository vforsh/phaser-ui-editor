import { Command } from 'commander'
import { Ctx } from '../lib/context'
import { ControlInput } from '../lib/rpc/types'

export function register(program: Command, ctx: Ctx) {
	program
		.command('get-asset-info')
		.description('Get detailed information about an asset by id or project-relative path')
		.option('--id <id>', 'Asset id')
		.option('--path <path>', 'Asset path (project-relative)')
		.action(async (options: { id?: string; path?: string }) => {
			const params = options.id ? { id: options.id } : { path: options.path }

			if (!params.id && !params.path) {
				throw new Error('get-asset-info requires --id or --path')
			}

			const result = await ctx.rpc.request('get-asset-info', params as ControlInput<'get-asset-info'>)
			ctx.output.printKV(result)
		})
}
