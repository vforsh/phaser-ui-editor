import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ActionIcon, Group, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { state } from '@state/State'
import clsx from 'clsx'
import {
	ChevronDown,
	Eye,
	EyeOff,
	FolderSearch,
	Group as GroupIcon,
	Image,
	ImageUpscale,
	Lock,
	Type,
	TypeOutline,
	Unlock,
} from 'lucide-react'
import { useContextMenu } from 'mantine-contextmenu'
import { memo, useMemo, useState } from 'react'
import { match } from 'ts-pattern'
import { useSnapshot } from 'valtio'
import { createHierarchyItemContextMenuItems } from '../hierarchyPanel/HierarchyPanel'
import styles from './HierarchyItem.module.css'

const INDENT_SIZE = 26
const ICON_MARGIN = 8

/**
 * Get the asset id of the object.
 * If the object is the root of a prefab, return the prefab id.
 * If the object has a prefab, return the prefab id (this is for containers only)
 * If the object has an asset, return the asset id (this is for images, spritesheets, etc.)
 * Otherwise, return undefined.
 */
export function getLinkedAssetId(objState: EditableObjectJson, isRoot: boolean): string | undefined {
	if (isRoot) {
		return state.canvas.currentPrefab?.id
	}

	const asset = 'asset' in objState ? objState.asset : null
	if (asset) {
		return asset.id
	}

	const prefab = 'prefab' in objState ? objState.prefab : null
	if (prefab) {
		return prefab.id
	}

	return undefined
}

interface HierarchyItemProps {
	objState: EditableObjectJson
	activeEditContextId: string | undefined
	isRoot?: boolean
	level?: number
	selectedIds: readonly string[]
	hoveredIds: readonly string[]
	isLastChild?: Boolean
}

const HierarchyItem = memo(function HierarchyItem({
	objState,
	activeEditContextId,
	isRoot = false,
	selectedIds,
	hoveredIds,
	level = 0,
	isLastChild = false,
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
		return match({ type })
			.with({ type: 'Container' }, () => <GroupIcon size={16} />)
			.with({ type: 'Image' }, () => <Image size={16} />)
			.with({ type: 'NineSlice' }, () => <ImageUpscale size={16} />)
			.with({ type: 'BitmapText' }, () => <TypeOutline size={16} />)
			.with({ type: 'Text' }, () => <Type size={16} />)
			.exhaustive()
	}, [type])

	const containerStyle = useMemo(
		() => ({
			paddingLeft: level * INDENT_SIZE + ICON_MARGIN,
		}),
		[level]
	)

	const linkedAssetId = getLinkedAssetId(objState, isRoot)

	return (
		<>
			<div
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onContextMenu={(e) => {
					e.preventDefault()
					const menuItems = createHierarchyItemContextMenuItems(objState, isRoot)
					showContextMenu(menuItems, { style: { width: 200 } })(e)
				}}
				onDoubleClick={() => {
					if (objState.type === 'Container') {
						state.app?.commands.emit('switch-to-context', objId)
					} else {
						state.app?.commands.emit('select-object', objId)
					}
				}}
				className={clsx(styles.itemContainer, {
					[styles.itemSelected]: isSelectedInCanvas,
					[styles.itemHovered]: isHovered,
				})}
				style={containerStyle}
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
								level={level + 1}
								selectedIds={selectedIds}
								hoveredIds={hoveredIds}
								isLastChild={index === arr.length - 1}
								activeEditContextId={activeEditContextId}
							/>
						)
					})
					.filter(Boolean)}
		</>
	)
})

export default HierarchyItem
