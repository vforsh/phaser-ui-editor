import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { Divider, Paper, ScrollArea, Stack } from '@mantine/core'
import { useWindowEvent } from '@mantine/hooks'
import { state, useSnapshot } from '@state/State'
import { useEffect, useRef, useState } from 'react'
import { ILogObj, Logger } from 'tslog'
import { useAppCommands } from '../../di/DiContext'
import HierarchyItem from './HierarchyItem'
import styles from './HierarchyPanel.module.css'
import { HierarchyPanelTitle } from './HierarchyPanelTitle'
import { ICON_MARGIN, INDENT_SIZE } from './constants'

export const HIERARCHY_ITEMS_CONTAINER_ID = 'hierarchy-items-container'

export type HierarchyPanelProps = {
	logger: Logger<ILogObj>
}

interface DropPreview {
	targetId: string
	index: number
	left: number
	top: number
}

// Helper functions for keyboard handling
function getVisibleItems(): EditableObjectJson[] {
	// find all dom elements with id starting with 'hierarchy-item-'
	const items = document.querySelectorAll(
		`#${HIERARCHY_ITEMS_CONTAINER_ID} [id^="hierarchy-item-"]`
	) as NodeListOf<HTMLDivElement>

	const objs: EditableObjectJson[] = []

	for (const item of items) {
		const objId = item.dataset.objId
		const obj = state.canvas.objectById(objId!)
		if (obj) {
			objs.push(obj)
		}
	}

	return objs
}

function findParentContainer(objId: string, objs: EditableObjectJson[]): EditableObjectJson | undefined {
	for (const obj of objs) {
		if (obj.type === 'Container' && obj.children.some((child) => child.id === objId)) {
			return obj
		}
	}
}

function scrollIntoView(objId: string) {
	const element = document.getElementById(`hierarchy-item-${objId}`)
	if (element) {
		element.scrollIntoView({ block: 'nearest', behavior: 'instant' })
	}
}

export default function HierarchyPanel(props: HierarchyPanelProps) {
	const panelRef = useRef<HTMLDivElement>(null)
	const scrollAreaRef = useRef<HTMLDivElement>(null)
	const [isFocused, setIsFocused] = useState(document.activeElement === panelRef.current)
	const [dropPreview, setDropPreview] = useState<DropPreview | null>(null)
	const [openedItems, setOpenedItems] = useState<Set<string>>(new Set())
	const [itemToRename, setItemToRename] = useState<string | null>(null)
	const canvasSnap = useSnapshot(state.canvas)
	const rootState = canvasSnap.root && state.canvas.objectById(canvasSnap.root.id)
	const appCommands = useAppCommands()

	const selectAndScrollIntoView = (objId: string) => {
		appCommands.emit('select-object', objId)
		scrollIntoView(objId)
	}

	if (rootState && rootState.type !== 'Container') {
		throw new Error('Root must be a container')
	}

	// Update openedItems when rootState changes
	useEffect(() => {
		if (!rootState) {
			return
		}

		const containersIds = new Set<string>()

		const addContainersRecursively = (obj: EditableObjectJson) => {
			if (obj.type === 'Container') {
				containersIds.add(obj.id)
				obj.children.forEach((child) => {
					const childObj = state.canvas.objectById(child.id)
					if (childObj) {
						addContainersRecursively(childObj)
					}
				})
			}
		}

		addContainersRecursively(rootState)
		setOpenedItems(containersIds)
	}, [rootState])

	const handleToggleOpen = (objId: string) => {
		setOpenedItems((prev) => {
			const next = new Set(prev)
			if (next.has(objId)) {
				next.delete(objId)
			} else {
				next.add(objId)
			}
			return next
		})
	}

	const startRename = (objId: string) => {
		setItemToRename(objId)
	}

	const completeRename = (objId: string, newName: string) => {
		const objState = state.canvas.objectById(objId)
		if (objState) {
			objState.name = newName
		}

		setItemToRename(null)
	}

	useWindowEvent('keydown', (event) => {
		if (!isFocused) {
			return
		}

		if ((event.key === 's' || event.key === 'S') && (event.ctrlKey || event.metaKey)) {
			event.preventDefault()

			if (canvasSnap.hasUnsavedChanges) {
				appCommands.emit('save-prefab')
			}

			return
		}

		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault()
			appCommands.emit('delete-objects', canvasSnap.selection as string[])
			return
		}

		if (event.key === 'Escape') {
			event.preventDefault()
			// TODO focus on the canvas
			return
		}

		if (event.key === 'F2') {
			event.preventDefault()
			
			// Get the last selected object
			const lastSelectedId = canvasSnap.selection.at(-1)
			if (lastSelectedId) {
				startRename(lastSelectedId)
			}
		}

		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'A', 'a'].includes(event.key)) {
			event.preventDefault()

			const visibleItems = getVisibleItems()
			const lastSelectedId = canvasSnap.selection.at(-1)
			const lastSelectedIndex = visibleItems.findIndex((item) => item.id === lastSelectedId)

			// if nothing is selected, select the first or last item depending on the key pressed
			if (lastSelectedIndex === -1) {
				let itemToSelect: EditableObjectJson | undefined
				if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
					itemToSelect = visibleItems.at(-1)
				} else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
					itemToSelect = visibleItems.at(0)
				}

				if (itemToSelect) {
					selectAndScrollIntoView(itemToSelect.id)
				}

				return
			}

			const lastSelectedItem = visibleItems[lastSelectedIndex]

			const handleArrowUp = () => {
				if (lastSelectedIndex <= 0) {
					return
				}

				const prevItem = visibleItems[lastSelectedIndex - 1]
				if (!event.shiftKey) {
					selectAndScrollIntoView(prevItem.id)
					return
				}

				const currentItemParent = findParentContainer(lastSelectedItem.id, visibleItems)
				const prevItemParent = findParentContainer(prevItem.id, visibleItems)
				const hasSameParent = currentItemParent === prevItemParent
				if (!hasSameParent) {
					return
				}

				const isPrevItemSelected = canvasSnap.selection.includes(prevItem.id)
				if (isPrevItemSelected) {
					appCommands.emit('remove-object-from-selection', prevItem.id)
				} else {
					appCommands.emit('add-object-to-selection', prevItem.id)
					scrollIntoView(prevItem.id)
				}
			}

			const handleArrowDown = () => {
				if (lastSelectedIndex >= visibleItems.length - 1) {
					return
				}

				const nextItem = visibleItems[lastSelectedIndex + 1]
				if (!event.shiftKey) {
					selectAndScrollIntoView(nextItem.id)
					return
				}

				const currentItemParent = findParentContainer(lastSelectedItem.id, visibleItems)
				const nextItemParent = findParentContainer(nextItem.id, visibleItems)
				const hasSameParent = currentItemParent === nextItemParent
				if (!hasSameParent) {
					return
				}

				const isNextItemSelected = canvasSnap.selection.includes(nextItem.id)
				if (isNextItemSelected) {
					appCommands.emit('remove-object-from-selection', nextItem.id)
				} else {
					appCommands.emit('add-object-to-selection', nextItem.id)
					scrollIntoView(nextItem.id)
				}
			}

			switch (event.key) {
				case 'ArrowUp':
					handleArrowUp()
					break

				case 'ArrowDown':
					handleArrowDown()
					break

				case 'ArrowRight': {
					if (lastSelectedItem.type === 'Container' && !openedItems.has(lastSelectedItem.id)) {
						handleToggleOpen(lastSelectedItem.id)
					}
					break
				}

				case 'ArrowLeft': {
					if (lastSelectedItem.type === 'Container' && openedItems.has(lastSelectedItem.id)) {
						handleToggleOpen(lastSelectedItem.id)
					} else {
						const parentContainer = findParentContainer(lastSelectedItem.id, visibleItems)
						if (parentContainer) {
							selectAndScrollIntoView(parentContainer.id)
						}
					}
					break
				}

				case 'A':
				case 'a':
					if (event.ctrlKey || event.metaKey) {
						const siblingsIds = state.canvas.siblingIds(lastSelectedItem.id)
						appCommands.emit('select-objects', siblingsIds)
					}
					break
			}
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
					appCommands.emit('move-object-in-hierarchy', sourceId, targetParent!.id, targetParentIndex)

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
					onSave={() => appCommands.emit('save-prefab')}
					onDiscard={() => {
						if (confirm('Are you sure you want to discard all unsaved changes?')) {
							appCommands.emit('discard-unsaved-prefab')
						}
					}}
				/>
				<Divider />
				<ScrollArea
					style={{ flex: 1 }}
					viewportRef={scrollAreaRef}
					onClick={(e) => {
						if (e.target === scrollAreaRef.current) {
							appCommands.emit('clear-selection')
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
								onToggleOpen={handleToggleOpen}
								openedItems={openedItems}
								itemToRename={itemToRename}
								onRenameComplete={completeRename}
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
