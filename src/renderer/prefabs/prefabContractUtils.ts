import type { CanvasDocumentNodeJson, PrefabFile, PrefabInstanceJson, PrefabOverrides } from '@tekton/runtime'

export function createEmptyPrefabFile(): PrefabFile {
	return {
		content: null,
		assetPack: [],
	}
}

export function createEmptyPrefabOverrides(): PrefabOverrides {
	return { objects: [], components: [] }
}

export function isPrefabInstanceJson(node: CanvasDocumentNodeJson): node is PrefabInstanceJson {
	return node.type === 'PrefabInstance'
}
