import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { Divider, Paper, ScrollArea, Stack } from '@mantine/core'
import { useWindowEvent } from '@mantine/hooks'
import { state, useSnapshot } from '@state/State'
import { useEffect, useRef, useState } from 'react'
import { Logger } from 'tslog'
import HierarchyItem from './HierarchyItem'
import styles from './HierarchyPanel.module.css'
import { HierarchyPanelTitle } from './HierarchyPanelTitle'
import { ICON_MARGIN, INDENT_SIZE } from './constants'

export const HIERARCHY_ITEMS_CONTAINER_ID = 'hierarchy-items-container'

export type HierarchyPanelProps = {
	logger: Logger<{}>
}

interface DropPreview {
	targetId: string
	index: number
	left: number
	top: number
}

export default function HierarchyPanel(props: HierarchyPanelProps) {
	const { logger } = props

	const panelRef = useRef<HTMLDivElement>(null)
	const scrollAreaRef = useRef<HTMLDivElement>(null)
	const [isFocused, setIsFocused] = useState(document.activeElement === panelRef.current)
	const [dropPreview, setDropPreview] = useState<DropPreview | null>(null)
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

	// Setup drag and drop monitoring
	useEffect(() => {
		if (!panelRef.current) {
			return
		}

		const boundingRects = new Map<HTMLElement, DOMRect>()

		let elements: Element[] = []

		const cleanup = combine(
			monitorForElements({
				canMonitor: ({ source }) => {
					return source.data.metaType === 'hierarchy-item'
				},
				onDragStart() {
					boundingRects.clear()

					elements = Array.from(
						document.querySelectorAll(`#${HIERARCHY_ITEMS_CONTAINER_ID} [id^="hierarchy-item-"]`)
					)

					setDropPreview(null)
				},
				onDrag(args) {
					const { location } = args
					if (!location.current.dropTargets.length) {
						setDropPreview(null)
						return
					}

					const target = location.current.dropTargets[0]
					const targetElement = document.getElementById(`hierarchy-item-${target.data.id}`)
					if (!targetElement) {
						setDropPreview(null)
						return
					}

					const targetIndex = elements.indexOf(targetElement)
					if (targetIndex === -1) {
						setDropPreview(null)
						return
					}

					const level = parseInt(targetElement.dataset.level || '0', 10)
					const left = level * INDENT_SIZE + ICON_MARGIN + 7
					const rect = boundingRects.get(targetElement) || targetElement.getBoundingClientRect()
					boundingRects.set(targetElement, rect)

					const containerRect = document.getElementById(HIERARCHY_ITEMS_CONTAINER_ID)!.getBoundingClientRect()
					const top = rect.top - containerRect.top + rect.height

					setDropPreview({
						targetId: target.data.id as string,
						index: targetIndex,
						left,
						top,
					})
				},
				onDrop(args) {
					const { location, source } = args

					// Don't allow dropping root item
					if (source.data.isRoot) {
						return
					}

					// If not dropped on a valid target, ignore
					if (!location.current.dropTargets.length) {
						setDropPreview(null)
						return
					}

					const sourceId = source.data.id as string
					const targetData = location.current.dropTargets[0].data
					const targetId = targetData.id as string

					const targetElement = document.getElementById(`hierarchy-item-${targetId}`)
					const targetIndex = elements.indexOf(targetElement!)
					if (targetIndex === -1) {
						setDropPreview(null)
						return
					}

					// Don't allow dropping on itself
					if (sourceId === targetId) {
						setDropPreview(null)
						return
					}

					let targetParent: EditableContainerJson | undefined
					let targetParentIndex: number | undefined

					const targetObject = state.canvas.objectById(targetId)
					if (targetObject!.type === 'Container') {
						// if target is a container, we move the dragged object to the first index of the container
						targetParent = targetObject
						targetParentIndex = 0
					} else {
						// if target is not a container, we move the dragged object next to the target object (in the same container)
						targetParent = state.canvas.objectById(targetData!.parentId as string) as EditableContainerJson
						targetParentIndex = targetParent.children.findIndex((child) => child.id === targetId) + 1
					}

					// Emit move command
					state.app?.commands.emit('move-object-in-hierarchy', sourceId, targetParent!.id, targetParentIndex)

					setDropPreview(null)
				},
			})
		)

		return () => {
			cleanup()
			boundingRects.clear()
			elements.length = 0
		}
	}, [])

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
					<Stack gap={0} id={HIERARCHY_ITEMS_CONTAINER_ID} style={{ position: 'relative' }}>
						{rootState && (
							<HierarchyItem
								key={rootState.id}
								objState={rootState}
								parentId={'super-root'}
								level={0}
								selectedIds={canvasSnap.selection}
								hoveredIds={canvasSnap.hover}
								isLastChild={true}
								isRoot={true}
								activeEditContextId={canvasSnap.activeContextId}
								isPanelFocused={isFocused}
							/>
						)}
						{dropPreview && (
							<div
								style={{
									position: 'absolute',
									top: `${dropPreview.top}px`,
									left: `${dropPreview.left}px`,
									right: 0,
									zIndex: 10,
								}}
							>
								<DropIndicator
									instruction={{
										type: 'reorder-below',
										currentLevel: dropPreview.left / 26,
										indentPerLevel: 1,
									}}
								/>
							</div>
						)}
					</Stack>
				</ScrollArea>
			</Stack>
		</Paper>
	)
}
