import { tryit } from '@components/canvas/phaser/robowhale/utils/functions/tryit'
import { Paper, ScrollArea, Stack } from '@mantine/core'
import { state } from '@state/State'
import { useEffect, useState } from 'react'
import { Logger } from 'tslog'
import { useSnapshot } from 'valtio'
import { AppCommandsEmitter } from '../../AppCommands'
import { addHierarchyPaths } from '../../data/mockHierarchy'
import { HierarchyItemData } from '../../types/hierarchy'
import { PanelTitle } from '../PanelTitle'
import HierarchyItem from './HierarchyItem'

function setItemProp<K extends keyof HierarchyItemData>(
	items: HierarchyItemData[],
	itemPath: string,
	prop: K,
	value: HierarchyItemData[K]
): HierarchyItemData[] {
	return items.map((item) => {
		if (item.path === itemPath) {
			return { ...item, [prop]: value }
		}

		if (item.type === 'Container') {
			return {
				...item,
				children: setItemProp(item.children, itemPath, prop, value),
			}
		}

		return item
	})
}

function setItemVisibility(items: HierarchyItemData[], itemPath: string, visible: boolean): HierarchyItemData[] {
	return setItemProp(items, itemPath, 'visible', visible)
}

function setItemLock(items: HierarchyItemData[], itemPath: string, locked: boolean): HierarchyItemData[] {
	return setItemProp(items, itemPath, 'locked', locked)
}

function setItemsSelected(items: HierarchyItemData[], selectedIds: string[]): HierarchyItemData[] {
	return items.map((item) => {
		if (selectedIds.includes(item.id)) {
			return { ...item, isSelected: true }
		}

		if (item.type === 'Container') {
			return {
				...item,
				isSelected: false,
				children: setItemsSelected(item.children, selectedIds),
			}
		}

		return { ...item, isSelected: false }
	})
}

function setItemsHovered(items: HierarchyItemData[], hoveredIds: string[]): HierarchyItemData[] {
	return items.map((item) => {
		if (hoveredIds.includes(item.id)) {
			return { ...item, isHovered: true }
		}

		if (item.type === 'Container' && item.children) {
			return {
				...item,
				children: setItemsHovered(item.children, hoveredIds),
			}
		}

		return { ...item, isHovered: false }
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

function getInitialSelectedIds(commands: AppCommandsEmitter): string[] {
	const [error, selection] = tryit(() => commands.emit('request-selection'))
	if (error) {
		return []
	}

	if (!selection) {
		return []
	}

	return selection
}

export type HierarchyPanelProps = {
	logger: Logger<{}>
}

export default function HierarchyPanel(props: HierarchyPanelProps) {
	const { logger } = props
	const snap = useSnapshot(state)

	const appCommands = snap.app?.commands as AppCommandsEmitter

	const initialSelectedIds = appCommands ? getInitialSelectedIds(appCommands) : []
	const [selectedIds, setSelectedIds] = useState(initialSelectedIds)

	const [hoveredIds, setHoveredIds] = useState<string[]>([])

	const initialHierarchy = appCommands ? getInitialHierarchy(appCommands) : []
	const initialHierarchyWithSelection = setItemsSelected(initialHierarchy, selectedIds)
	const [hierarchy, setHierarchy] = useState(initialHierarchyWithSelection)

	useEffect(() => {
		const phaserEvents = snap.phaser?.events
		if (!phaserEvents) {
			return
		}

		const destroyController = new AbortController()
		const signal = destroyController.signal

		// Add listeners
		phaserEvents.on(
			'hierarchy-changed',
			(hierarchy) => {
				const withPaths = addHierarchyPaths([hierarchy])
				const withSelection = setItemsSelected(withPaths, selectedIds)
				const withHovered = setItemsHovered(withSelection, hoveredIds)
				setHierarchy(withHovered)
			},
			null,
			signal
		)

		phaserEvents.on(
			'selection-changed',
			(selection) => {
				setSelectedIds(selection)
				setHierarchy((prev) => setItemsSelected(prev, selection))
			},
			null,
			signal
		)

		phaserEvents.on(
			'hover-changed',
			(hoveredIds) => {
				setHoveredIds(hoveredIds)
				setHierarchy((prev) => setItemsHovered(prev, hoveredIds))
			},
			null,
			signal
		)

		// Cleanup function
		return () => destroyController.abort()
	}, [snap.phaser?.events, logger, selectedIds, hoveredIds])

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
						{hierarchy.map((item, index, arr) => {
							return (
								<HierarchyItem
									key={item.path}
									item={item}
									isLastChild={index === arr.length - 1}
									isSelected={item.isSelected}
									isHovered={item.isHovered}
									setItemVisibility={handleToggleVisibility}
									setItemLock={handleToggleLock}
								/>
							)
						})}
					</Stack>
				</ScrollArea>
			</Stack>
		</Paper>
	)
}
