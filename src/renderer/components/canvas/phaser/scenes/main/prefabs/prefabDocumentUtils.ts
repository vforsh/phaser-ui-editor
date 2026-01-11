import type { CanvasDocumentNodeJson, EditableObjectJson, NodeAddress, PrefabInstanceJson, PrefabOverrides } from '@tekton/runtime'

import type { EditableContainer } from '../objects/EditableContainer'
import type { EditableObject } from '../objects/EditableObject'

import { createEmptyPrefabOverrides, isPrefabInstanceJson } from '../../../../../../prefabs/prefabContractUtils'
import { createLocalId } from '../objects/localId'

export type PrefabInstanceMeta = {
	localId: string
	prefabRef: PrefabInstanceJson['prefabRef']
	overrides: PrefabOverrides
}

export type ResolvedPrefabNode = {
	json: EditableObjectJson
	address: NodeAddress
	children?: ResolvedPrefabNode[]
	prefabInstance?: PrefabInstanceMeta
}

export type ResolvedPrefabTree = {
	root: ResolvedPrefabNode
	addressMap: Map<string, ResolvedPrefabNode>
}

export function isPrefabInstanceRuntimeRoot(obj: EditableObject): boolean {
	return obj.kind === 'Container' && Boolean((obj as EditableContainer).prefab) && obj.prefabMeta?.instanceRootRuntimeId === obj.id
}

export function addressKey(address: NodeAddress): string {
	return address.map((segment) => (segment.kind === 'local' ? `local:${segment.localId}` : `prefab:${segment.prefabId}`)).join('|')
}

export function ensureDocumentLocalIds(root: CanvasDocumentNodeJson): void {
	const seen = new Set<string>()

	function walk(node: CanvasDocumentNodeJson): void {
		if (!node.localId || seen.has(node.localId)) {
			let next = createLocalId()
			while (seen.has(next)) {
				next = createLocalId()
			}
			node.localId = next
		}
		seen.add(node.localId)

		if (node.type === 'Container') {
			for (const child of node.children) {
				walk(child)
			}
		}
	}

	walk(root)
}

export function ensureNodeLocalId<T extends CanvasDocumentNodeJson>(node: T): T {
	if (!node.localId) {
		node.localId = createLocalId()
	}
	if (isPrefabInstanceJson(node)) {
		node.overrides = normalizeOverrides(node.overrides)
	}
	return node
}

export function normalizeOverrides(overrides?: PrefabOverrides): PrefabOverrides {
	return {
		objects: overrides?.objects ?? [],
		components: overrides?.components ?? [],
	}
}

export function cloneResolvedTree(tree: ResolvedPrefabTree): ResolvedPrefabTree {
	const cloneNode = (node: ResolvedPrefabNode): ResolvedPrefabNode => {
		const json = (
			typeof structuredClone === 'function' ? structuredClone(node.json) : JSON.parse(JSON.stringify(node.json))
		) as EditableObjectJson
		const cloned: ResolvedPrefabNode = {
			json,
			address: node.address,
			prefabInstance: node.prefabInstance,
		}
		if (node.children) {
			cloned.children = node.children.map((child) => cloneNode(child))
		}
		return cloned
	}

	const root = cloneNode(tree.root)
	const addressMap = new Map<string, ResolvedPrefabNode>()
	collectResolvedNodes(root, addressMap)

	return { root, addressMap }
}

export function collectResolvedNodes(node: ResolvedPrefabNode, map: Map<string, ResolvedPrefabNode>) {
	map.set(addressKey(node.address), node)
	if (node.children) {
		for (const child of node.children) {
			collectResolvedNodes(child, map)
		}
	}
}

export function prefixResolvedTree(tree: ResolvedPrefabTree, prefix: NodeAddress): void {
	const applyPrefix = (node: ResolvedPrefabNode) => {
		node.address = prefix.concat(node.address)
		if (node.children) {
			node.children.forEach((child) => applyPrefix(child))
		}
	}

	applyPrefix(tree.root)
	tree.addressMap.clear()
	collectResolvedNodes(tree.root, tree.addressMap)
}

export function normalizePrefabInstance(instance: PrefabInstanceJson): PrefabInstanceMeta {
	return {
		localId: instance.localId ?? createLocalId(),
		prefabRef: instance.prefabRef,
		overrides: normalizeOverrides(instance.overrides),
	}
}

export function createEmptyOverrides(): PrefabOverrides {
	return createEmptyPrefabOverrides()
}
