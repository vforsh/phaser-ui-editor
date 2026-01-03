import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('openProject')
		.description('Open a project by path')
		.requiredOption('--path <path>', 'Project path')
		.action(async (options: { path: string }) => {
			const result = await ctx.rpc.request('openProject', { path: options.path })
			ctx.output.printKV(result)
		})
}
