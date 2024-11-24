import { Paper, ScrollArea, Stack } from '@mantine/core'
import { useState } from 'react'
import { mockHierarchy } from '../data/mockHierarchy'
import type { HierarchyItem as HierarchyItemType } from '../types/hierarchy'
import HierarchyItem from './HierarchyItem'
import { PanelTitle } from './PanelTitle'

function updateItemVisibility(items: HierarchyItemType[], path: string): HierarchyItemType[] {
	return items.map((item) => {
		if (item.path === path) {
			return { ...item, visible: !item.visible }
		}
		if (item.type === 'container' && item.children) {
			return {
				...item,
				children: updateItemVisibility(item.children, path),
			}
		}
		return item
	})
}

export default function HierarchyPanel() {
	const [hierarchy, setHierarchy] = useState(mockHierarchy)

	const handleToggleVisibility = (path: string) => {
		setHierarchy((prev) => updateItemVisibility(prev, path))
	}

	return (
		<Paper style={{ height: '100%', display: 'flex', flexDirection: 'column' }} radius="sm">
			<Stack gap="xs" p="xs" style={{ height: '100%', minHeight: 0 }}>
				<PanelTitle title="Hierarchy" />
				<ScrollArea style={{ flex: 1 }}>
					<Stack gap={0}>
						{hierarchy.map((item, index, arr) => (
							<HierarchyItem
								key={item.path}
								item={item}
								isLastChild={index === arr.length - 1}
								onToggleVisibility={handleToggleVisibility}
							/>
						))}
					</Stack>
				</ScrollArea>
			</Stack>
		</Paper>
	)
}
