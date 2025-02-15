import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ActionIcon, Group, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { useWindowEvent } from '@mantine/hooks'
import { state } from '@state/State'
import clsx from 'clsx'
import { ChevronDown, Eye, EyeOff, FolderSearch, Lock, Unlock } from 'lucide-react'
import { ContextMenuOptions, useContextMenu } from 'mantine-contextmenu'
import { useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'
import { createHierarchyItemContextMenuItems } from '../hierarchyPanel/HierarchyPanel'
import styles from './HierarchyItem.module.css'
import { getHierarchyItemIcon, getLinkedAssetId } from './hierarchyUtils'

const INDENT_SIZE = 26
const ICON_MARGIN = 8

interface HierarchyItemProps {
	objState: EditableObjectJson
	parentId: string
	activeEditContextId: string | undefined
	isRoot?: boolean
	level?: number
	selectedIds: readonly string[]
	hoveredIds: readonly string[]
	isLastChild?: Boolean
	isPanelFocused?: boolean
}

export default function HierarchyItem({
	objState,
	parentId,
	activeEditContextId,
	isRoot = false,
	selectedIds,
	hoveredIds,
	level = 0,
	isLastChild = false,
	isPanelFocused = false,
}: HierarchyItemProps) {
	const theme = useMantineTheme()
	const [isOpen, setIsOpen] = useState(true)
	const [isHovered, setIsHovered] = useState(false)
	const { showContextMenu } = useContextMenu()

	// Only subscribe to needed properties
	const { name, type, visible, locked } = useSnapshot(objState)

	const objId = objState.id
	const isSelectedInCanvas = selectedIds.includes(objId)
	const isHoveredInCanvas = hoveredIds.includes(objId)
	const isActiveEditContext = activeEditContextId === objId

	const getIcon = useMemo(() => {
		return getHierarchyItemIcon(type)
	}, [type])

	const linkedAssetId = getLinkedAssetId(objState, isRoot)

	const getObjIdFromElementId = (elementId: string) => {
		const sliceIndex = elementId.lastIndexOf('-')
		return elementId.slice(sliceIndex + 1)
	}

	const getVisibleItems = (): EditableObjectJson[] => {
		// find all dom elements with id starting with 'hierarchy-item-'
		const items = document.querySelectorAll('[id^="hierarchy-item-"]')

		const objs: EditableObjectJson[] = []

		for (const item of items) {
			const objId = getObjIdFromElementId(item.id)
			const obj = state.canvas.objectById(objId)
			if (obj) {
				objs.push(obj)
			}
		}

		return objs
	}

	const findParentContainer = (objId: string, objs: EditableObjectJson[]): EditableObjectJson | undefined => {
		for (const obj of objs) {
			if (obj.type === 'Container' && obj.children.some((child) => child.id === objId)) {
				return obj
			}
		}
	}

	const selectAndScrollIntoView = (objId: string) => {
		state.app?.commands.emit('select-object', objId)
		scrollIntoView(objId)
	}

	const scrollIntoView = (objId: string) => {
		const element = document.getElementById(`hierarchy-item-${objId}`)
		if (element) {
			element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
		}
	}

	useWindowEvent('keydown', (event) => {
		if (!isPanelFocused) {
			return
		}

		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'A', 'a'].includes(event.key)) {
			event.preventDefault()

			const visibleItems = getVisibleItems()

			const lastSelectedId = selectedIds.at(-1)
			const currentIndex = visibleItems.findIndex((item) => item.id === lastSelectedId)

			// if nothing is selected, select the first or last item depending on the key pressed
			if (currentIndex === -1) {
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

			const currentItem = visibleItems[currentIndex]

			const handleArrowUp = () => {
				if (currentIndex <= 0) {
					return
				}

				const prevItem = visibleItems[currentIndex - 1]
				if (!event.shiftKey) {
					selectAndScrollIntoView(prevItem.id)
					return
				}

				const currentItemParent = findParentContainer(currentItem.id, visibleItems)
				const prevItemParent = findParentContainer(prevItem.id, visibleItems)
				const hasSameParent = currentItemParent === prevItemParent
				if (!hasSameParent) {
					return
				}

				const isPrevItemSelected = selectedIds.includes(prevItem.id)
				if (isPrevItemSelected) {
					state.app?.commands.emit('remove-object-from-selection', prevItem.id)
				} else {
					state.app?.commands.emit('add-object-to-selection', prevItem.id)
					scrollIntoView(prevItem.id)
				}
			}

			const handleArrowDown = () => {
				if (currentIndex >= visibleItems.length - 1) {
					return
				}

				const nextItem = visibleItems[currentIndex + 1]
				if (!event.shiftKey) {
					selectAndScrollIntoView(nextItem.id)
					return
				}

				const currentItemParent = findParentContainer(currentItem.id, visibleItems)
				const nextItemParent = findParentContainer(nextItem.id, visibleItems)
				const hasSameParent = currentItemParent === nextItemParent
				if (!hasSameParent) {
					return
				}

				const isNextItemSelected = selectedIds.includes(nextItem.id)
				if (isNextItemSelected) {
					state.app?.commands.emit('remove-object-from-selection', nextItem.id)
				} else {
					state.app?.commands.emit('add-object-to-selection', nextItem.id)
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

				case 'ArrowRight':
					if (currentItem.type === 'Container') {
						if (currentItem.id === objId && !isOpen) {
							setIsOpen(true)
						}
					} else {
						// TODO find the parent container of the current item
						// then find the next sibling of the parent container and select it
					}
					break

				case 'ArrowLeft':
					if (currentItem.type === 'Container') {
						if (currentItem.id === objId && isOpen) {
							setIsOpen(false)
						}
					} else {
						const parentContainer = findParentContainer(currentItem.id, visibleItems)
						if (parentContainer) {
							selectAndScrollIntoView(parentContainer.id)
						}
					}
					break

				case 'Delete':
				case 'Backspace':
					// Check if the item is root, can't delete the root
					if (!isRoot) {
						state.app?.commands.emit('delete-object', currentItem.id)

						// Select the next or previous item after deleting
						const itemToSelect = visibleItems[currentIndex + 1] ?? visibleItems[currentIndex - 1]
						if (itemToSelect) {
							selectAndScrollIntoView(itemToSelect.id)
						}
					}
					break

				case 'A':
				case 'a':
					if (event.ctrlKey || event.metaKey) {
						// TODO select all items on current level
					}
					break
			}
		}
	})

	const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.shiftKey) {
			const lastSelectedId = selectedIds.at(-1)
			if (!lastSelectedId) {
				selectAndScrollIntoView(objId)
				return
			}

			const clickedElement = e.currentTarget as HTMLElement
			const clickedElementId = clickedElement.dataset.objId
			if (!clickedElementId) {
				return
			}

			if (selectedIds.includes(clickedElementId)) {
				state.app?.commands.emit('remove-object-from-selection', clickedElementId)
				return
			}

			const visibleItems = getVisibleItems()
			const lastSelectedItemIndex = visibleItems.findIndex((item) => item.id === lastSelectedId)
			const clickedItemIndex = visibleItems.findIndex((item) => item.id === clickedElementId)

			const startIndex = Math.min(lastSelectedItemIndex, clickedItemIndex)
			const endIndex = Math.max(lastSelectedItemIndex, clickedItemIndex)

			for (let index = startIndex; index <= endIndex; index++) {
				const item = visibleItems[index]
				if (item && !selectedIds.includes(item.id)) {
					state.app?.commands.emit('add-object-to-selection', item.id)
				}
			}

			return
		}

		if (e.ctrlKey || e.metaKey) {
			if (isSelectedInCanvas) {
				state.app?.commands.emit('remove-object-from-selection', objId)
			} else {
				state.app?.commands.emit('add-object-to-selection', objId)
			}

			return
		}

		state.app?.commands.emit('select-object', objId)
	}

	return (
		<>
			<div
				id={`hierarchy-item-${objId}`}
				data-obj-id={objId}
				data-parent-id={parentId}
				data-selected={isSelectedInCanvas}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onContextMenu={(e) => {
					e.preventDefault()
					const menuItems = createHierarchyItemContextMenuItems(objState, isRoot)
					const menuOptions: ContextMenuOptions = { style: { width: 200 } }
					showContextMenu(menuItems, menuOptions)(e)
					state.app?.commands.emit('select-object', objId)
				}}
				onClick={handleClick}
				className={clsx(styles.itemContainer, {
					[styles.itemSelected]: isSelectedInCanvas,
					[styles.itemHovered]: isHovered,
				})}
				style={{
					paddingLeft: level * INDENT_SIZE + ICON_MARGIN,
				}}
			>
				{level > 0 &&
					Array.from({ length: level }).map((_, index) => (
						<div
							key={index}
							className={styles.gridLine}
							style={{
								left: index * INDENT_SIZE + ICON_MARGIN * 2,
								top: 0,
								bottom: isLastChild && index === level - 1 ? '50%' : 0,
							}}
						/>
					))}

				{level > 0 && (
					<div
						className={styles.horizontalConnector}
						style={{
							left: (level - 1) * INDENT_SIZE + ICON_MARGIN * 2 + 1,
							width: type === 'Container' ? INDENT_SIZE - ICON_MARGIN : INDENT_SIZE + 4,
						}}
					/>
				)}

				<Group gap="xs" wrap="nowrap">
					<div style={{ width: 16, height: 16 }}>
						{type === 'Container' && (
							<div
								onClick={(e) => {
									if (type === 'Container') {
										if (e.shiftKey) {
											// TODO recursively toggle open/close all children
										} else {
											setIsOpen((prev) => !prev)
										}
									}
								}}
								className={clsx(styles.chevron, {
									[styles.chevronOpen]: isOpen,
									[styles.chevronClosed]: !isOpen,
									[styles.chevronHovered]: isHovered,
								})}
							>
								<ChevronDown size={14} />
							</div>
						)}
					</div>
					<div className={styles.icon}>{getIcon}</div>
					<Text
						size="sm"
						className={clsx(styles.itemName, {
							[styles.itemNameHovered]: isHovered,
							[styles.itemNameNormal]: !isHovered,
							[styles.hiddenItem]: !visible,
						})}
						style={{
							fontWeight: isActiveEditContext ? 'bold' : 'normal',
							textDecoration: isActiveEditContext ? 'underline' : 'none',
						}}
					>
						{name}
					</Text>

					<Group gap="4px" wrap="nowrap" mr="xs">
						<Tooltip label={'Locate in Assets'}>
							<ActionIcon
								variant="subtle"
								size="sm"
								color={theme.colors.gray[5]}
								disabled={!linkedAssetId}
								onClick={(e) => {
									e.stopPropagation()
									state.assets.locateAsset?.(linkedAssetId!)
								}}
								className={clsx(styles.actionButton, {
									[styles.actionButtonVisible]: isHovered,
								})}
							>
								<FolderSearch size={14} />
							</ActionIcon>
						</Tooltip>

						<Tooltip label={visible ? 'Hide' : 'Show'}>
							<ActionIcon
								variant="subtle"
								size="sm"
								color={theme.colors.gray[5]}
								onClick={(e) => {
									e.stopPropagation()
									objState.visible = !visible
								}}
								className={clsx(styles.actionButton, {
									[styles.actionButtonVisible]: isHovered,
								})}
							>
								{visible ? <Eye size={14} /> : <EyeOff size={14} />}
							</ActionIcon>
						</Tooltip>

						<Tooltip label={locked ? 'Unlock' : 'Lock'}>
							<ActionIcon
								variant="subtle"
								size="sm"
								color={theme.colors.gray[5]}
								onClick={(e) => {
									e.stopPropagation()
									objState.locked = !locked
								}}
								className={clsx(styles.actionButton, {
									[styles.actionButtonVisible]: locked || isHovered,
								})}
							>
								{locked ? <Lock size={14} /> : <Unlock size={14} />}
							</ActionIcon>
						</Tooltip>
					</Group>
				</Group>
			</div>

			{objState.type === 'Container' &&
				isOpen &&
				objState.children
					.map((childSnap, index, arr) => {
						const childState = state.canvas.objectById(childSnap.id)
						if (!childState) {
							return null
						}

						return (
							<HierarchyItem
								key={childSnap.id}
								objState={childState}
								parentId={objId}
								level={level + 1}
								selectedIds={selectedIds}
								hoveredIds={hoveredIds}
								isLastChild={index === arr.length - 1}
								activeEditContextId={activeEditContextId}
								isPanelFocused={isPanelFocused}
							/>
						)
					})
					.filter(Boolean)}
		</>
	)
}
