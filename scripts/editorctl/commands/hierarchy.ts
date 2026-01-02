import { Command } from 'commander'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('hierarchy')
		.description('List the current hierarchy')
		.action(async () => {
			const result = await ctx.rpc.request('list-hierarchy', {})

			if (result.length === 0) {
				ctx.output.printText('Hierarchy is empty.')
				return
			}

			const rows = [['ID', 'Name', 'Type', 'Parent ID'], ...result.map((obj) => [obj.id, obj.name, obj.type, obj.parentId ?? ''])]

			ctx.output.printTable(rows)
		})
}
