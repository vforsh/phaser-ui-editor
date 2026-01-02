import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('switch-context')
		.description('Switch to context by id or path')
		.option('--id <id>', 'Object id')
		.option('--path <path>', 'Object path')
		.action(async (options: { id?: string; path?: string }) => {
			const params = options.id ? { id: options.id } : { path: options.path }

			if (!params.id && !params.path) {
				throw new Error('switch-context requires --id or --path')
			}

			const result = await ctx.rpc.request('switch-to-context', params as any)
			ctx.output.printKV(result)
		})
}
