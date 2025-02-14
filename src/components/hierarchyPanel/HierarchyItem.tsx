import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ActionIcon, alpha, Group, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { state } from '@state/State'
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
import { useState } from 'react'
import { match } from 'ts-pattern'
import { useSnapshot } from 'valtio'

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
	isHovered?: boolean
	isOpened?: boolean
}

export default function HierarchyItem({
	objState,
	activeEditContextId,
	hasUnsavedChanges = false,
	isRoot = false,
	selectedIds,
	hoveredIds,
	level = 0,
	isLastChild = false,
	isHovered: isHoveredInitially = false,
	isOpened: isOpenedInitially = true,
}: HierarchyItemProps) {
	const theme = useMantineTheme()
	const [isOpen, setIsOpen] = useState(isOpenedInitially)
	const [isHovered, setIsHovered] = useState(isHoveredInitially)
	const objSnap = useSnapshot(objState)
	const objId = objState.id
	const isSelectedInCanvas = selectedIds.includes(objId)
	const isHoveredInCanvas = hoveredIds.includes(objId)
	const isActiveEditContext = activeEditContextId === objId

	const getIcon = () => {
		return match(objSnap)
			.with({ type: 'Container' }, () => <GroupIcon size={16} />)
			.with({ type: 'Image' }, () => <Image size={16} />)
			.with({ type: 'NineSlice' }, () => <ImageUpscale size={16} />)
			.with({ type: 'BitmapText' }, () => <TypeOutline size={16} />)
			.with({ type: 'Text' }, () => <Type size={16} />)
			.exhaustive()
	}

	const toggleOpen = (e: React.MouseEvent<HTMLDivElement>) => {
		if (objSnap.type === 'Container') {
			if (e.shiftKey) {
				// TODO recursively toggle open/close all children
			} else {
				setIsOpen(!isOpen)
			}
		}
	}

	const setItemVisibility = (visible: boolean) => {
		objState!.visible = visible
	}

	const setItemLock = (locked: boolean) => {
		objState!.locked = locked
	}

	const gridLineThickness = 1
	const gridLineColor = theme.colors.dark[2]

	return (
		<>
			<div
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onDoubleClick={() => state.app?.commands.emit('select-object', objId)}
				style={{
					padding: '0.3rem 0',
					paddingLeft: level * INDENT_SIZE + ICON_MARGIN,
					borderRadius: theme.radius.sm,
					backgroundColor: isSelectedInCanvas
						? alpha(theme.colors.blue[9], 0.5)
						: isHovered
							? theme.colors.dark[6]
							: 'transparent',
					transition: 'all 33ms ease',
					position: 'relative',
					width: '100%',
					cursor: 'pointer',
				}}
			>
				{/* Grid lines */}
				{level > 0 &&
					Array.from({ length: level }).map((_, index) => (
						<div
							key={index}
							style={{
								position: 'absolute',
								left: index * INDENT_SIZE + ICON_MARGIN * 2,
								top: 0,
								bottom: isLastChild && index === level - 1 ? '50%' : 0,
								width: `${gridLineThickness}px`,
								backgroundColor: gridLineColor,
								opacity: 0.33,
							}}
						/>
					))}

				{/* Horizontal connector */}
				{level > 0 && (
					<div
						style={{
							position: 'absolute',
							left: (level - 1) * INDENT_SIZE + ICON_MARGIN * 2 + gridLineThickness,
							top: '50%',
							width: objSnap.type === 'Container' ? INDENT_SIZE - ICON_MARGIN : INDENT_SIZE + 4,
							height: `${gridLineThickness}px`,
							backgroundColor: gridLineColor,
							opacity: 0.33,
						}}
					/>
				)}

				<Group gap="xs" wrap="nowrap">
					{/* Add placeholder space for non-container items to maintain alignment */}
					<div style={{ width: 16, height: 16 }}>
						{objSnap.type === 'Container' && (
							<div
								onClick={toggleOpen}
								style={{
									transition: 'transform 33ms ease',
									transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
									color: isHovered ? theme.colors.blue[4] : 'inherit',
									width: '100%',
									height: '100%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<ChevronDown size={14} />
							</div>
						)}
					</div>
					<div
						style={{
							transition: 'color 33ms ease',
							color: isHovered ? theme.colors.blue[4] : theme.colors.blue[4],
							width: 16,
							height: 16,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						{getIcon()}
					</div>
					<Text
						size="sm"
						style={{
							color: isHovered ? theme.white : theme.colors.gray[4],
							transition: 'color 33ms ease',
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							opacity: objSnap.visible ? 1 : 0.5,
							userSelect: 'none',
							fontWeight: hasUnsavedChanges || isActiveEditContext ? 'bold' : 'normal',
							textDecoration: isActiveEditContext ? 'underline' : 'none',
							flex: 1,
						}}
					>
						{hasUnsavedChanges ? objSnap.name + ' *' : objSnap.name}
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
									style={{
										opacity: isHovered ? 1 : 0,
										transition: 'opacity 33ms ease',
									}}
								>
									<Save size={14} />
								</ActionIcon>
							</Tooltip>
						)}

						<Tooltip label={objSnap.visible ? 'Hide' : 'Show'}>
							<ActionIcon
								variant="subtle"
								size="sm"
								color={theme.colors.gray[5]}
								onClick={(e) => {
									e.stopPropagation()
									setItemVisibility(!objSnap.visible)
								}}
								style={{
									opacity: isHovered ? 1 : 0,
									transition: 'opacity 33ms ease',
								}}
							>
								{objSnap.visible ? <Eye size={14} /> : <EyeOff size={14} />}
							</ActionIcon>
						</Tooltip>

						<Tooltip label={objSnap.locked ? 'Unlock' : 'Lock'}>
							<ActionIcon
								variant="subtle"
								size="sm"
								color={theme.colors.gray[5]}
								onClick={(e) => {
									e.stopPropagation()
									setItemLock(!objSnap.locked)
								}}
								style={{
									opacity: objSnap.locked ? 1 : isHovered ? 1 : 0,
									transition: 'opacity 33ms ease',
								}}
							>
								{objSnap.locked ? <Lock size={14} /> : <Unlock size={14} />}
							</ActionIcon>
						</Tooltip>
					</Group>
				</Group>
			</div>

			{objSnap.type === 'Container' &&
				isOpen &&
				objSnap.children
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
}
