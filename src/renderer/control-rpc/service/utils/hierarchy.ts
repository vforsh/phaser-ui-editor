import type { HierarchyNode } from '@tekton/control-rpc-contract'
import type { EditableContainerJson, EditableObjectJson } from '@tekton/runtime'

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
