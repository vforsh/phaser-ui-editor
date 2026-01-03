import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'

export type ReadonlyContainerJson = Omit<EditableContainerJson, 'children'> & { children: readonly EditableObjectJson[] }

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
