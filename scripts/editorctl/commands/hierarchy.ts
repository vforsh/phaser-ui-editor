import { Command } from 'commander'
import type { HierarchyNode } from '../../../src/control-rpc/api/ControlApi'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('hierarchy')
		.description('List the current hierarchy')
		.action(async () => {
			const result = await ctx.rpc.request('list-hierarchy', {})

			if (ctx.config.outputMode === 'json') {
				ctx.output.printJson(result)
				return
			}

			const flat = flattenHierarchy(result)
			if (flat.length === 0) {
				ctx.output.printText('Hierarchy is empty.')
				return
			}

			const rows = [
				['ID', 'Name', 'Type', 'Parent ID'],
				...flat.map((obj) => [obj.id, obj.name, obj.type, obj.parentId ?? '']),
			]

			ctx.output.printTable(rows)
		})
}

type FlatHierarchyNode = {
	id: string
	name: string
	type: string
	parentId?: string
}

function flattenHierarchy(root: HierarchyNode): FlatHierarchyNode[] {
	const output: FlatHierarchyNode[] = []
	const visit = (node: HierarchyNode, parentId?: string) => {
		output.push({ id: node.id, name: node.name, type: node.type, parentId })
		if (!node.children) {
			return
		}
		for (const child of node.children) {
			visit(child, node.id)
		}
	}

	visit(root)
	return output
}
