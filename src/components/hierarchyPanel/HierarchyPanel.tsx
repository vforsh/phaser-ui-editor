import { tryit } from '@components/canvas/phaser/robowhale/utils/functions/tryit'
import { Paper, ScrollArea, Stack } from '@mantine/core'
import { state } from '@state/State'
import { useState } from 'react'
import { Logger } from 'tslog'
import { useSnapshot } from 'valtio'
import { AppCommandsEmitter } from '../../AppCommands'
import { addHierarchyPaths } from '../../data/mockHierarchy'
import { HierarchyItemData } from '../../types/hierarchy'
import { PanelTitle } from '../PanelTitle'
import HierarchyItem from './HierarchyItem'

function setItemVisibility(items: HierarchyItemData[], path: string, visible: boolean): HierarchyItemData[] {
	return items.map((item) => {
		if (item.path === path) {
			return { ...item, visible }
		}

		if (item.type === 'Container' && item.children) {
			return {
				...item,
				children: setItemVisibility(item.children, path, visible),
			}
		}

		return item
	})
}

function setItemLock(items: HierarchyItemData[], path: string, locked: boolean): HierarchyItemData[] {
	return items.map((item) => {
		if (item.path === path) {
			return { ...item, locked }
		}

		if (item.type === 'Container' && item.children) {
			return {
				...item,
				children: setItemLock(item.children, path, locked),
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

export type HierarchyPanelProps = {
	logger: Logger<{}>
}

export default function HierarchyPanel(props: HierarchyPanelProps) {
	const { logger } = props
	const snap = useSnapshot(state)
	const initialHierarchy = snap.app?.commands ? getInitialHierarchy(snap.app.commands as AppCommandsEmitter) : []
	const [hierarchy, setHierarchy] = useState(initialHierarchy)

	snap.phaser?.events.on('hierarchy-changed', (hierarchy) => {
		setHierarchy(addHierarchyPaths([hierarchy]))
	})

	const handleToggleVisibility = (itemPath: string, visible: boolean) => {
		setHierarchy((prev) => setItemVisibility(prev, itemPath, visible))
		snap.app?.commands.emit('set-object-visibility', itemPath, visible)
		// logger.info('set-object-visibility', path, visible)
	}

	const handleToggleLock = (itemPath: string, locked: boolean) => {
		setHierarchy((prev) => setItemLock(prev, itemPath, locked))
		snap.app?.commands.emit('set-object-lock', itemPath, locked)
		// logger.info('set-object-lock', path, locked)
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
								setItemVisibility={handleToggleVisibility}
								setItemLock={handleToggleLock}
							/>
						))}
					</Stack>
				</ScrollArea>
			</Stack>
		</Paper>
	)
}
