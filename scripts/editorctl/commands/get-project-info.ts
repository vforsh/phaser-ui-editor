import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('get-project-info')
		.description('Get detailed information about the currently open project')
		.action(async () => {
			const result = await ctx.rpc.request('get-project-info', {})
			ctx.output.printKV(result)
		})
}
