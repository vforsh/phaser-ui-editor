import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('listEditors')
		.description('List all active editor instances')
		.action(async () => {
			const result = await ctx.rpc.request('listEditors', {})

			if (ctx.config.outputMode === 'json') {
				ctx.output.printJson(result)
				return
			}

			ctx.output.printTable([
				['windowId', 'projectPath'],
				...result.editors.map((e) => [e.windowId.toString(), e.projectPath ?? '-']),
			])
		})
}
