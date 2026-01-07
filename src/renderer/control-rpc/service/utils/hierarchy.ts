import type { HierarchyNode } from '@tekton/control-rpc-contract'

import type { EditableContainerJson } from '../../../components/canvas/phaser/scenes/main/objects/EditableContainer'
import type { EditableObjectJson } from '../../../components/canvas/phaser/scenes/main/objects/EditableObject'

export function buildHierarchyNode(obj: EditableObjectJson): HierarchyNode {
	const base: HierarchyNode = {
		id: obj.id,
		name: obj.name,
		type: obj.type,
	}

	if (!('children' in obj)) {
		return base
	}

	const container = obj as EditableContainerJson
	const children = container.children.map((child) => buildHierarchyNode(child))
	if (children.length > 0) {
		base.children = children
	}

	return base
}
