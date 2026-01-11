import type { EditableObjectJson } from '@tekton/runtime'

import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12)

export function createLocalId(): string {
	return nanoid()
}

export function assignNewLocalIds(root: EditableObjectJson): void {
	function walk(node: EditableObjectJson): void {
		node.localId = createLocalId()

		if (node.type === 'Container') {
			for (const child of node.children) {
				walk(child)
			}
		}
	}

	walk(root)
}

export function cloneWithNewLocalIds<T extends EditableObjectJson>(root: T): T {
	const cloned = typeof structuredClone === 'function' ? structuredClone(root) : (JSON.parse(JSON.stringify(root)) as T)
	assignNewLocalIds(cloned)
	return cloned
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
