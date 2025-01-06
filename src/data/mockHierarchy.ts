import { EditableObjectJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import type { HierarchyItemData } from '../types/hierarchy'

// keep it to use in bolt.dev
export const mockHierarchy: HierarchyItemData[] = addHierarchyPaths([
	{
		type: 'Container',
		name: 'root',
		locked: false,
		visible: true,
		children: [
			{
				type: 'Image',
				name: 'chefCherry_center__005d',
				locked: false,
				visible: true,
			},
			{
				type: 'Container',
				name: 'group__9f92',
				locked: false,
				visible: true,
				children: [
					{
						type: 'Image',
						name: 'chefCherry_bottomRight__9eff',
						locked: false,
						visible: true,
					},
					{
						type: 'Image',
						name: 'chefCherry_bottomLeft__1393',
						locked: false,
						visible: true,
					},
					{
						type: 'Container',
						name: 'group__acaf',
						locked: false,
						visible: true,
						children: [
							{
								type: 'Image',
								name: 'chefCherry_topLeft__b5a3',
								locked: false,
								visible: true,
							},
							{
								type: 'Image',
								name: 'chefCherry_topRight__8945',
								locked: false,
								visible: true,
							},
						],
					},
				],
			},
		],
	},
])

export function addHierarchyPaths(items: EditableObjectJsonBasic[], parentPath = ''): HierarchyItemData[] {
	return items.map((item) => {
		const path = parentPath ? `${parentPath}/${item.name}` : item.name

		if (item.type === 'Container' && item.children) {
			return { ...item, path, children: addHierarchyPaths(item.children, path) } as HierarchyItemData
		}

		return { ...item, path } as HierarchyItemData
	})
}
