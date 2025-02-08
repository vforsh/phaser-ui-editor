// @ts-nocheck

import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/IEditableObject'
import type { HierarchyItemData } from '../types/hierarchy'

// keep it to use in bolt.dev
export const mockHierarchy: HierarchyItemData[] = addHierarchyPaths([
	{
		type: 'Container',
		id: 'c184762d',
		name: 'root',
		locked: false,
		visible: true,
		children: [
			{
				type: 'Image',
				id: '10569f05',
				name: 'chefCherry_topLeft__6c5f',
				locked: false,
				visible: true,
			},
			{
				type: 'Image',
				id: 'e1d3518e',
				name: 'chefCherry_topRight__d21c',
				locked: false,
				visible: true,
			},
			{
				type: 'Image',
				id: '19fd2134',
				name: 'chefCherry_bottomRight__4bed',
				locked: false,
				visible: true,
			},
			{
				type: 'Image',
				id: 'd69327c7',
				name: 'chefCherry_bottomLeft__fd4c',
				locked: false,
				visible: true,
			},
			{
				type: 'Image',
				id: '7ef35ff8',
				name: 'chefCherry_center__cf7f',
				locked: false,
				visible: true,
			},
		],
	},
])

export function addHierarchyPaths(items: EditableObjectJson[], parentPath = ''): HierarchyItemData[] {
	return items.map((item) => {
		const path = parentPath ? `${parentPath}/${item.name}` : item.name

		if (item.type === 'Container' && item.children) {
			return { ...item, path, children: addHierarchyPaths(item.children, path) } as HierarchyItemData
		}

		return { ...item, path } as HierarchyItemData
	})
}
