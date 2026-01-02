import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('open-project')
		.description('Open a project by path')
		.requiredOption('--path <path>', 'Project path')
		.action(async (options: { path: string }) => {
			const result = await ctx.rpc.request('open-project', { path: options.path })
			ctx.output.printKV(result)
		})
}
