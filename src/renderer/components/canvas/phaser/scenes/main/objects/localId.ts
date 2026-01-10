import { customAlphabet } from 'nanoid'

import type { EditableObjectJson } from './EditableObject'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12)

export function createLocalId(): string {
	return nanoid()
}

export function ensureLocalIds(root: EditableObjectJson): void {
	const seen = new Set<string>()

	function walk(node: EditableObjectJson): void {
		if (!node.localId || seen.has(node.localId)) {
			let id = createLocalId()
			while (seen.has(id)) {
				id = createLocalId()
			}
			node.localId = id
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
