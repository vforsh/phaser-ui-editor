import type { EditableContainerJson, EditableObjectJson } from '@tekton/runtime'

import { state, subscribe } from '../../../state/State'

/**
 * Checks if the given ID exists in the prefab document tree.
 */
export function isIdInPrefabDocument(root: EditableContainerJson | null, id: string): boolean {
	if (!root) {
		return false
	}
	if (root.id === id) {
		return true
	}

	const stack: EditableObjectJson[] = [...(root.children || [])]
	while (stack.length > 0) {
		const node = stack.pop()!
		if (node.id === id) {
			return true
		}
		if (node.type === 'Container') {
			stack.push(...(node.children || []))
		}
	}

	return false
}

/**
 * Waits for the document revision to increase beyond the given value.
 */
export async function waitForDocumentRevisionBump(beforeRevision: number, options: { timeoutMs: number }): Promise<boolean> {
	if (state.canvas.documentRevision > beforeRevision) {
		return true
	}

	return new Promise((resolve) => {
		const controller = new AbortController()
		const timeout = setTimeout(() => {
			controller.abort()
			resolve(false)
		}, options.timeoutMs)

		subscribe(
			state.canvas,
			() => {
				if (state.canvas.documentRevision > beforeRevision) {
					clearTimeout(timeout)
					controller.abort()
					resolve(true)
				}
			},
			{ signal: controller.signal },
		)
	})
}
