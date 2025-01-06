import { tryit } from '@components/canvas/phaser/robowhale/utils/functions/tryit'
import { Paper, ScrollArea, Stack } from '@mantine/core'
import { state } from '@state/State'
import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { AppCommandsEmitter } from '../../AppCommands'
import { addHierarchyPaths } from '../../data/mockHierarchy'
import { HierarchyItemData } from '../../types/hierarchy'
import { PanelTitle } from '../PanelTitle'
import HierarchyItem from './HierarchyItem'

function updateItemVisibility(items: HierarchyItemData[], path: string): HierarchyItemData[] {
	return items.map((item) => {
		if (item.path === path) {
			return { ...item, visible: !item.visible }
		}

		if (item.type === 'Container' && item.children) {
			return {
				...item,
				children: updateItemVisibility(item.children, path),
			}
		}

		return item
	})
}

function updateItemLock(items: HierarchyItemData[], path: string): HierarchyItemData[] {
	return items.map((item) => {
		if (item.path === path) {
			return { ...item, locked: !item.locked }
		}

		if (item.type === 'Container' && item.children) {
			return {
				...item,
				children: updateItemLock(item.children, path),
			}
		}

		return item
	})
}

function getInitialHierarchy(commands: AppCommandsEmitter): HierarchyItemData[] {
	const [error, hierarchy] = tryit(() => commands.emit('request-hierarchy'))
	if (error) {
		return []
	}

	if (!hierarchy) {
		return []
	}

	return addHierarchyPaths(hierarchy)
}

export default function HierarchyPanel() {
	const snap = useSnapshot(state)
	const initialHierarchy = snap.app?.commands ? getInitialHierarchy(snap.app.commands as AppCommandsEmitter) : []
	const [hierarchy, setHierarchy] = useState(initialHierarchy)

	snap.phaser?.events.on('hierarchy-changed', (hierarchy) => {
		setHierarchy(addHierarchyPaths([hierarchy]))
	})

	const handleToggleVisibility = (path: string) => {
		setHierarchy((prev) => updateItemVisibility(prev, path))
	}

	const handleToggleLock = (path: string) => {
		setHierarchy((prev) => updateItemLock(prev, path))
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
								onToggleLock={handleToggleLock}
							/>
						))}
					</Stack>
				</ScrollArea>
			</Stack>
		</Paper>
	)
}
