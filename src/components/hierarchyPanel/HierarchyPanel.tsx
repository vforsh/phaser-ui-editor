import { Divider, Paper, ScrollArea, Stack } from '@mantine/core'
import { useWindowEvent } from '@mantine/hooks'
import { state, useSnapshot } from '@state/State'
import { useRef, useState } from 'react'
import { Logger } from 'tslog'
import HierarchyItem from './HierarchyItem'
import styles from './HierarchyPanel.module.css'
import { HierarchyPanelTitle } from './HierarchyPanelTitle'

export const HIERARCHY_ITEMS_CONTAINER_ID = 'hierarchy-items-container'

export type HierarchyPanelProps = {
	logger: Logger<{}>
}

export default function HierarchyPanel(props: HierarchyPanelProps) {
	const { logger } = props

	const panelRef = useRef<HTMLDivElement>(null)

	const scrollAreaRef = useRef<HTMLDivElement>(null)

	const [isFocused, setIsFocused] = useState(document.activeElement === panelRef.current)

	const canvasSnap = useSnapshot(state.canvas)

	const rootState = canvasSnap.root && state.canvas.objectById(canvasSnap.root.id)

	if (rootState && rootState.type !== 'Container') {
		throw new Error('Root must be a container')
	}

	useWindowEvent('keydown', (event) => {
		if (!isFocused) {
			return
		}

		if ((event.key === 's' || event.key === 'S') && (event.ctrlKey || event.metaKey)) {
			event.preventDefault()

			if (canvasSnap.hasUnsavedChanges) {
				state.app?.commands.emit('save-prefab')
			}

			return
		}

		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault()

			state.app?.commands.emit('delete-objects', canvasSnap.selection as string[])
		}

		if (event.key === 'Escape') {
			event.preventDefault()

			// TODO focus on the canvas
		}
	})

	return (
		<Paper
			style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
			radius="sm"
			ref={panelRef}
			onClick={() => panelRef.current?.focus()}
			tabIndex={1}
			onFocus={() => setIsFocused(true)}
			onBlur={() => setIsFocused(false)}
			className={styles.panel}
		>
			<Stack gap="xs" p="xs" style={{ height: '100%', minHeight: 0 }}>
				<HierarchyPanelTitle
					title={canvasSnap.currentPrefab?.name || 'Hierarchy'}
					hasUnsavedChanges={canvasSnap.hasUnsavedChanges}
					onSave={() => state.app?.commands.emit('save-prefab')}
					onDiscard={() => state.app?.commands.emit('discard-unsaved-prefab')}
				/>
				<Divider />
				<ScrollArea
					style={{ flex: 1 }}
					viewportRef={scrollAreaRef}
					onClick={(e) => {
						if (e.target === scrollAreaRef.current) {
							state.app?.commands.emit('clear-selection')
						}
					}}
				>
					<Stack gap={0} id={HIERARCHY_ITEMS_CONTAINER_ID}>
						{rootState && (
							<HierarchyItem
								key={rootState.id}
								objState={rootState}
								parentId={'super-root'}
								selectedIds={canvasSnap.selection}
								hoveredIds={canvasSnap.hover}
								isLastChild={true}
								isRoot={true}
								activeEditContextId={canvasSnap.activeContextId}
								isPanelFocused={isFocused}
							/>
						)}
					</Stack>
				</ScrollArea>
			</Stack>
		</Paper>
	)
}
