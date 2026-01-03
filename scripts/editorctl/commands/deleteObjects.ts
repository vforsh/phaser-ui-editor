import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('deleteObjects')
		.description('Delete objects by ids')
		.requiredOption('--ids <ids>', 'Comma-separated list of ids')
		.action(async (options: { ids: string }) => {
			const ids = options.ids
				.split(',')
				.map((id) => id.trim())
				.filter(Boolean)

			const result = await ctx.rpc.request('deleteObjects', { ids })
			ctx.output.printKV(result)
		})
}
