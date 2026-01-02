import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('select-object')
		.description('Select an object by id or path')
		.option('--id <id>', 'Object id')
		.option('--path <path>', 'Object path')
		.action(async (options: { id?: string; path?: string }) => {
			const params = options.id ? { id: options.id } : { path: options.path }

			if (!params.id && !params.path) {
				throw new Error('select-object requires --id or --path')
			}

			const result = await ctx.rpc.request('select-object', params as any)
			ctx.output.printKV(result)
		})
}
