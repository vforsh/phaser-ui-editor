import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import {
	draggable,
	dropTargetForElements,
	ElementDropTargetGetFeedbackArgs,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import {
	EditableObjectJson,
	EditableObjectJsonType,
} from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { Group, Text, useMantineTheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { until } from '@open-draft/until'
import { state, unproxy } from '@state/State'
import { getErrorLog } from '@utils/error/utils'
import clsx from 'clsx'
import {
	ChevronDown,
	ChevronRight,
	ClipboardCopy,
	ClipboardPaste,
	Copy,
	FilePlus2,
	FolderSearch,
	Scissors,
	TextCursorInput,
	Trash2,
} from 'lucide-react'
import { ContextMenuItemOptions, ContextMenuOptions, useContextMenu } from 'mantine-contextmenu'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Snapshot, useSnapshot } from 'valtio'
import { ICON_MARGIN, INDENT_SIZE } from './constants'
import styles from './HierarchyItem.module.css'
import HierarchyItemIcons from './HierarchyItemIcons'
import { HIERARCHY_ITEMS_CONTAINER_ID } from './HierarchyPanel'
import { getHierarchyItemIcon, getLinkedAssetId } from './hierarchyUtils'

export interface HierarchyItemDragData {
	id: string
	metaType: 'hierarchy-item'
	type: EditableObjectJsonType
	name: string
	isRoot: boolean
}

function createContextMenuItems(obj: Snapshot<EditableObjectJson>, isRoot = false): ContextMenuItemOptions[] {
	let dividers = 1
	const divider = () => {
		return { key: `divider-${dividers++}` }
	}

	const appCommands = state.app?.commands

	const linkedAssetId = getLinkedAssetId(obj as EditableObjectJson, isRoot)

	const items: ContextMenuItemOptions[] = [
		{
			key: 'create',
			icon: <FilePlus2 size={16} />,
			title: 'Create',
			iconRight: <ChevronRight size={14} />,
			items: [
				{
					key: 'create-container',
					icon: getHierarchyItemIcon('Container'),
					title: 'Container',
					onClick: () => {
						appCommands?.emit('create-object', { clickedObjId: obj.id, type: 'Container' })
					},
				},
			],
		},
		divider(),
		{
			key: 'copy',
			title: 'Copy',
			icon: <ClipboardCopy size={16} />,
			onClick: () => {
				appCommands?.emit('copy-object', obj.id)
			},
		},
		{
			key: 'duplicate',
			title: 'Duplicate',
			icon: <Copy size={16} />,
			disabled: isRoot,
			onClick: () => {
				appCommands?.emit('duplicate-object', obj.id)
			},
		},
		{
			key: 'cut',
			title: 'Cut',
			icon: <Scissors size={16} />,
			disabled: isRoot,
			onClick: () => {
				appCommands?.emit('cut-object', obj.id)
			},
		},
		{
			key: 'paste',
			title: 'Paste',
			icon: <ClipboardPaste size={16} />,
			onClick: () => {
				appCommands?.emit('paste-object', obj.id)
			},
		},
		divider(),
		{
			key: 'locate-in-assets',
			title: 'Locate in Assets',
			icon: <FolderSearch size={16} />,
			disabled: !linkedAssetId,
			onClick: () => {
				state.assets.locateAsset?.(linkedAssetId!)
			},
		},
		divider(),
		{
			key: 'rename',
			title: 'Rename',
			icon: <TextCursorInput size={16} />,
			onClick: () => {
				console.log(`rename`, unproxy(obj))
			},
		},
		{
			key: 'delete',
			title: 'Delete',
			icon: <Trash2 size={16} />,
			color: 'red',
			disabled: isRoot,
			onClick: (event) => {
				appCommands?.emit('delete-objects', [obj.id])
			},
		},
		divider(),
		{
			key: 'copy-id',
			title: 'Copy ID',
			icon: <ClipboardCopy size={16} />,
			onClick: async () => {
				const { error } = await until(() => navigator.clipboard.writeText(obj.id))

				if (error) {
					notifications.show({
						title: 'Failed to copy ID',
						message: `${getErrorLog(error)}`,
						color: 'red',
						autoClose: 10_000,
					})

					return
				}

				notifications.show({
					title: 'ID Copied',
					message: `${obj.id} copied to clipboard`,
					color: 'green',
					autoClose: 10_000,
				})
			},
		},
		{
			key: 'copy-path',
			title: 'Copy Path',
			icon: <ClipboardCopy size={16} />,
			onClick: async () => {
				const path = appCommands?.emit('get-object-path', obj.id)
				if (!path) {
					return
				}

				const { error } = await until(() => navigator.clipboard.writeText(path))

				if (error) {
					notifications.show({
						title: 'Failed to copy path',
						message: `${getErrorLog(error)}`,
						color: 'red',
						autoClose: 10_000,
					})

					return
				}

				notifications.show({
					title: 'Path Copied',
					message: `${path} copied to clipboard`,
					color: 'green',
					autoClose: 10_000,
				})
			},
		},
	]

	return items
}

interface HierarchyItemProps {
	objState: EditableObjectJson
	parentId: string
	activeEditContextId: string | undefined
	isRoot?: boolean
	level: number
	selectedIds: readonly string[]
	hoveredIds: readonly string[]
	isLastChild?: Boolean
	isPanelFocused?: boolean
	onToggleOpen?: (objId: string) => void
	openedItems: Set<string>
	itemToRename: string | null
	onRenameComplete: (objId: string, newName: string) => void
}

export default function HierarchyItem({
	objState,
	parentId,
	activeEditContextId,
	isRoot = false,
	selectedIds,
	hoveredIds,
	level,
	isLastChild = false,
	isPanelFocused = false,
	onToggleOpen,
	openedItems,
	itemToRename,
	onRenameComplete,
}: HierarchyItemProps) {
	const theme = useMantineTheme()
	const [isHovered, setIsHovered] = useState(false)
	const { showContextMenu } = useContextMenu()
	const itemRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const objSnap = useSnapshot(objState)

	const objId = objState.id
	const isSelectedInCanvas = selectedIds.includes(objId)
	const isHoveredInCanvas = hoveredIds.includes(objId)
	const isActiveEditContext = activeEditContextId === objId
	const isOpen = openedItems.has(objId)

	const [editValue, setEditValue] = useState('')

	// Setup drag and drop
	useEffect(() => {
		if (!itemRef.current) {
			return
		}

		const cleanup = combine(
			draggable({
				element: itemRef.current,
				dragHandle: itemRef.current,
				getInitialData: () =>
					({
						id: objId,
						type: objSnap.type,
						name: objSnap.name,
						isRoot: isRoot,
						metaType: 'hierarchy-item',
					}) satisfies HierarchyItemDragData,
			}),
			dropTargetForElements({
				element: itemRef.current,
				getData: () => ({
					id: objId,
					type: objState.type,
					parentId: parentId,
					metaType: 'hierarchy-item',
					index: Array.from(document.querySelectorAll(`[data-parent-id="${parentId}"]`)).indexOf(
						itemRef.current!
					),
				}),
				canDrop: (args: ElementDropTargetGetFeedbackArgs) => {
					const sourceId = args.source.data.id as string
					const isSourceRoot = args.source.data.isRoot as boolean

					// Don't allow dropping root item
					if (isSourceRoot) {
						return false
					}

					return true
				},
			})
		)

		// Disable default drag preview
		const handleDragStart = (e: DragEvent) => {
			const emptyImg = new Image()
			emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
			e.dataTransfer?.setDragImage(emptyImg, 0, 0)
		}

		itemRef.current.addEventListener('dragstart', handleDragStart)

		return () => {
			cleanup()
			itemRef.current?.removeEventListener('dragstart', handleDragStart)
		}
	}, [objId, objSnap.name, isRoot, parentId])

	const icon = useMemo(() => {
		return getHierarchyItemIcon(objSnap.type)
	}, [objSnap.type])

	const linkedAssetId = useMemo(() => {
		return getLinkedAssetId(objSnap as EditableObjectJson, isRoot)
	}, [objSnap, isRoot])

	const getVisibleItems = (): EditableObjectJson[] => {
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

	const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.shiftKey) {
			const lastSelectedId = selectedIds.at(-1)
			if (!lastSelectedId) {
				state.app?.commands.emit('select-object', objId)
				return
			}

			const clickedElement = e.currentTarget as HTMLDivElement
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

	const handleToggleOpen = (e: React.MouseEvent) => {
		if (objSnap.type === 'Container') {
			if (e.shiftKey) {
				// TODO recursively toggle open/close all children
			} else {
				onToggleOpen?.(objId)
			}
		}
	}

	const handleRenameSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		e.stopPropagation()

		const isValidName = /^[a-zA-Z0-9_-]+$/.test(editValue)
		if (!isValidName || editValue.trim() === '') {
			return
		}

		onRenameComplete(objId, editValue)
	}

	const handleRenameCancel = () => {
		onRenameComplete(objId, objSnap.name)
	}

	const handleRenameKeyDown = (e: React.KeyboardEvent) => {
		e.stopPropagation()

		if (e.key === 'Escape') {
			handleRenameCancel()
		}
	}

	const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setEditValue(e.target.value)
	}

	const isValidInput = /^[a-zA-Z0-9_-]+$/.test(editValue)

	useEffect(() => {
		if (itemToRename === objId) {
			setEditValue(objSnap.name)
		}
	}, [itemToRename, objId, objSnap.name])

	useEffect(() => {
		if (itemToRename === objId && inputRef.current) {
			// Use a small timeout to ensure the input is mounted and focused
			const timeoutId = setTimeout(() => {
				inputRef.current?.select()
			}, 50)
			return () => clearTimeout(timeoutId)
		}
	}, [itemToRename, objId])

	return (
		<>
			<div
				ref={itemRef}
				id={`hierarchy-item-${objId}`}
				data-obj-id={objId}
				data-parent-id={parentId}
				data-level={level}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onContextMenu={(e) => {
					e.preventDefault()
					const menuItems = createContextMenuItems(objState, isRoot)
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
					cursor: isRoot ? 'default' : 'grab',
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
							width: objSnap.type === 'Container' ? INDENT_SIZE - ICON_MARGIN : INDENT_SIZE + 4,
						}}
					/>
				)}

				<Group gap="xs" wrap="nowrap">
					<div style={{ width: 16, height: 16, cursor: 'pointer' }}>
						{objSnap.type === 'Container' && (
							<div
								onClick={handleToggleOpen}
								className={clsx(styles.chevron, {
									[styles.chevronOpen]: isOpen,
									[styles.chevronClosed]: !isOpen,
									[styles.chevronHovered]: isHovered,
								})}
							>
								<ChevronDown size={14} style={{ marginLeft: 1 }} />
							</div>
						)}
					</div>
					<div className={styles.icon}>{icon}</div>
					{itemToRename === objId ? (
						<form onSubmit={handleRenameSubmit} style={{ flex: 1, margin: 0, padding: 0, display: 'flex' }}>
							<input
								ref={inputRef}
								value={editValue}
								onChange={handleRenameChange}
								onKeyDown={handleRenameKeyDown}
								onBlur={handleRenameCancel}
								autoFocus
								style={{
									backgroundColor: 'transparent',
									border: 'none',
									width: '100%',
									borderRadius: '3px',
									outline: isValidInput ? 'none' : '1px solid red',
									padding: '2px 0px',
									margin: 0,
									fontSize: '14px',
									lineHeight: '20px',
									color: 'inherit',
									minHeight: '24px',
								}}
							/>
						</form>
					) : (
						<Text
							size="sm"
							className={clsx(styles.itemName, {
								[styles.itemNameHovered]: isHovered,
								[styles.itemNameNormal]: !isHovered,
								[styles.hiddenItem]: !objSnap.visible,
							})}
							style={{
								fontWeight: isActiveEditContext ? 'bold' : 'normal',
								textDecoration: isActiveEditContext ? 'underline' : 'none',
								padding: '2px 0',
								minHeight: '24px',
								lineHeight: '20px',
							}}
						>
							{objSnap.name}
						</Text>
					)}

					<HierarchyItemIcons objState={objState} isHovered={isHovered} linkedAssetId={linkedAssetId} />
				</Group>
			</div>

			{objSnap.type === 'Container' &&
				isOpen &&
				objSnap.children
					.map((childSnap, index, arr) => {
						const childObj = state.canvas.objectById(childSnap.id)
						if (!childObj) {
							return null
						}

						return (
							<HierarchyItem
								key={childSnap.id}
								objState={childObj}
								parentId={objId}
								level={level + 1}
								selectedIds={selectedIds}
								hoveredIds={hoveredIds}
								isLastChild={index === arr.length - 1}
								activeEditContextId={activeEditContextId}
								isPanelFocused={isPanelFocused}
								onToggleOpen={onToggleOpen}
								openedItems={openedItems}
								itemToRename={itemToRename}
								onRenameComplete={onRenameComplete}
							/>
						)
					})
					.filter(Boolean)}
		</>
	)
}
