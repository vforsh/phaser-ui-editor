import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ActionIcon, Group, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { state } from '@state/State'
import clsx from 'clsx'
import {
	ChevronDown,
	Eye,
	EyeOff,
	Group as GroupIcon,
	Image,
	ImageUpscale,
	Lock,
	Save,
	Type,
	TypeOutline,
	Unlock,
} from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { match } from 'ts-pattern'
import { useSnapshot } from 'valtio'
import styles from './HierarchyItem.module.css'

const INDENT_SIZE = 26
const ICON_MARGIN = 8

interface HierarchyItemProps {
	objState: EditableObjectJson
	activeEditContextId: string | undefined
	hasUnsavedChanges?: boolean
	isRoot?: boolean
	level?: number
	selectedIds: readonly string[]
	hoveredIds: readonly string[]
	isLastChild?: Boolean
}

const HierarchyItem = memo(function HierarchyItem({
	objState,
	activeEditContextId,
	hasUnsavedChanges = false,
	isRoot = false,
	selectedIds,
	hoveredIds,
	level = 0,
	isLastChild = false,
}: HierarchyItemProps) {
	const theme = useMantineTheme()
	const [isOpen, setIsOpen] = useState(true)
	const [isHovered, setIsHovered] = useState(false)

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

	return (
		<>
			<div
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onDoubleClick={() => state.app?.commands.emit('select-object', objId)}
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
							fontWeight: hasUnsavedChanges || isActiveEditContext ? 'bold' : 'normal',
							textDecoration: isActiveEditContext ? 'underline' : 'none',
						}}
					>
						{hasUnsavedChanges ? name + ' *' : name}
					</Text>

					<Group gap="xs" wrap="nowrap" mr="xs">
						{isRoot && (
							<Tooltip label="Save">
								<ActionIcon
									variant="subtle"
									size="sm"
									color={theme.colors.gray[5]}
									disabled={!hasUnsavedChanges}
									onClick={(e) => {
										e.stopPropagation()
										state.app?.commands.emit('save-prefab')
									}}
									className={clsx(styles.actionButton, {
										[styles.actionButtonVisible]: isHovered,
									})}
								>
									<Save size={14} />
								</ActionIcon>
							</Tooltip>
						)}

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
