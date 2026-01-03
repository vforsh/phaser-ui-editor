import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('getProjectInfo')
		.description('Get detailed information about the currently open project')
		.action(async () => {
			const result = await ctx.rpc.request('getProjectInfo', {})
			ctx.output.printKV(result)
		})
}
