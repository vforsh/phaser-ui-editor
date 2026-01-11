import type { EditableContainerJson } from '@tekton/runtime'
import type { EditableObjectJson } from '@tekton/runtime'

export type ReadonlyContainerJson = Omit<EditableContainerJson, 'children'> & {
	children: readonly EditableObjectJson[]
}

export function findParentContainerId(root: ReadonlyContainerJson | null, objId: string): string | null {
	if (!root) {
		return null
	}

	for (const child of root.children) {
		if (child.id === objId) {
			return root.id
		}
		if (child.type === 'Container') {
			const found = findParentContainerId(child, objId)
			if (found) {
				return found
			}
		}
	}

	return null
}
