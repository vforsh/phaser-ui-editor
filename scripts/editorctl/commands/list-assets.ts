import { Command } from 'commander'
import { match } from 'ts-pattern'
import type { AssetNode } from '../../../src/control-rpc/contract'
import { Ctx } from '../lib/context'

export function register(program: Command, ctx: Ctx) {
	program
		.command('list-assets')
		.description('List the current project asset tree')
		.option(
			'--type <type>',
			'Filter by asset type (repeatable). Example: --type prefab --type folder',
			(value: string, previous: string[]) => [...previous, value],
			[]
		)
		.action(async (options: { type: string[] }) => {
			const params = options.type.length > 0 ? { types: options.type } : {}
			const result = await ctx.rpc.request('list-assets', params as any)

			if (ctx.config.outputMode === 'json') {
				ctx.output.printJson(result)
				return
			}

			const flat = flattenAssets(result.assets)
			if (flat.length === 0) {
				ctx.output.printText('No assets.')
				return
			}

			ctx.output.printTable([
				['ID', 'Name', 'Type', 'Path', 'Parent ID'],
				...flat.map((a) => [a.id, a.name, a.type, a.path, a.parentId ?? '']),
			])
		})
}

type FlatAssetNode = {
	id: string
	name: string
	type: string
	path: string
	parentId?: string
}

function getChildren(node: AssetNode): AssetNode[] {
	return match(node)
		.with({ type: 'folder' }, (folder) => folder.children ?? [])
		.with({ type: 'spritesheet' }, (spritesheet) => (spritesheet.frames ?? []) as AssetNode[])
		.with({ type: 'spritesheet-folder' }, (spritesheetFolder) => (spritesheetFolder.children ?? []) as AssetNode[])
		.otherwise(() => [])
}

function flattenAssets(roots: AssetNode[]): FlatAssetNode[] {
	const output: FlatAssetNode[] = []

	const visit = (node: AssetNode, parentId?: string) => {
		output.push({ id: node.id, name: node.name, type: node.type, path: node.path, parentId })

		const children = getChildren(node)
		if (children.length === 0) {
			return
		}

		for (const child of children) {
			visit(child, node.id)
		}
	}

	for (const root of roots) {
		visit(root)
	}

	return output
}

