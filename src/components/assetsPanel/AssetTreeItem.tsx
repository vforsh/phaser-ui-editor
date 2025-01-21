import { logger } from '@logs/logs'
import { alpha, Group, Stack, Text, UnstyledButton, useMantineTheme } from '@mantine/core'
import { state } from '@state/State'
import {
	ChevronDown,
	File,
	FileJson,
	FileSpreadsheet,
	FileType,
	Folder,
	FolderTree,
	Image,
	Images,
	LayoutGrid,
} from 'lucide-react'
import { useState } from 'react'
import { match } from 'ts-pattern'
import { Snapshot, useSnapshot } from 'valtio'
import { useDragAndDrop } from '../../hooks/useDragAndDrop'
import { isDraggableAsset, type AssetTreeItemData } from '../../types/assets'

const INDENT_SIZE = 20
const ICON_SIZE = 16
const ITEM_HEIGHT = 28
const BASE_PADDING = 3

interface AssetTreeItemProps {
	item: Snapshot<AssetTreeItemData>
	level?: number
	onToggle: (id: string) => void
	onSelect: (item: Snapshot<AssetTreeItemData>) => void
	onContextMenu: (item: Snapshot<AssetTreeItemData>, position: { x: number; y: number }) => void
	isSelected?: boolean
	isLastChild?: boolean
	isOpen?: boolean
	openFolders: Set<string>
}

export default function AssetTreeItem({
	item,
	level = 0,
	onToggle,
	onSelect,
	onContextMenu,
	isSelected = false,
	isLastChild = false,
	isOpen = false,
	openFolders,
}: AssetTreeItemProps) {
	const theme = useMantineTheme()
	const assetsSelectionSnap = useSnapshot(state.assets.selection)
	const [isHovered, setIsHovered] = useState(false)
	const dragAndDropLogger = logger.getOrCreate('assets')
	const { dragState, handleDragStart, handleDragEnd } = useDragAndDrop({ logger: dragAndDropLogger })
	const isDraggable = isDraggableAsset(item.type)

	const GRID_LINE_COLOR = theme.colors.gray[7]

	const getIcon = () => {
		return match(item)
			.with({ type: 'folder' }, () => <Folder size={ICON_SIZE} />)
			.with({ type: 'image' }, () => <Image size={ICON_SIZE} />)
			.with({ type: 'json' }, () => <FileJson size={ICON_SIZE} />)
			.with({ type: 'xml' }, () => <FileSpreadsheet size={ICON_SIZE} />)
			.with({ type: 'web-font' }, () => <FileType size={ICON_SIZE} />)
			.with({ type: 'bitmap-font' }, () => <FileType size={ICON_SIZE} />)
			.with({ type: 'spritesheet' }, () => <Images size={ICON_SIZE} />)
			.with({ type: 'spritesheet-folder' }, () => <FolderTree size={ICON_SIZE} />)
			.with({ type: 'spritesheet-frame' }, () => <LayoutGrid size={ICON_SIZE} />)
			.with({ type: 'file' }, () => <File size={ICON_SIZE} />)
			.with({ type: 'prefab' }, () => <File size={ICON_SIZE} />)
			.exhaustive()
	}

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault()

		match(item)
			.with({ type: 'folder' }, () => onToggle(item.id))
			.with({ type: 'spritesheet' }, () => onToggle(item.id))
			.with({ type: 'spritesheet-folder' }, () => onToggle(item.id))
			.otherwise(() => onSelect(item))
	}

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault()
		onContextMenu(item, { x: e.clientX, y: e.clientY })
	}

	const hasChildren = (item: Snapshot<AssetTreeItemData>): boolean => {
		return match(item)
			.with({ type: 'folder' }, (item) => item.children.length > 0)
			.with({ type: 'spritesheet' }, (item) => item.frames.length > 0)
			.with({ type: 'spritesheet-folder' }, (item) => item.children.length > 0)
			.otherwise(() => false)
	}

	const getChildren = (item: Snapshot<AssetTreeItemData>) => {
		return match(item)
			.with({ type: 'folder' }, (item) => item.children)
			.with({ type: 'spritesheet' }, (item) => item.frames)
			.with({ type: 'spritesheet-folder' }, (item) => item.children)
			.otherwise(() => [])
	}

	return (
		<Stack gap={0}>
			<UnstyledButton
				onClick={handleClick}
				onContextMenu={handleContextMenu}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				draggable={isDraggable}
				onDragStart={(e) => handleDragStart(item, e)}
				onDragEnd={handleDragEnd}
				style={{
					position: 'relative',
					width: '100%',
					height: ITEM_HEIGHT,
					backgroundColor: isSelected
						? alpha(theme.colors.blue[9], 0.5)
						: isHovered
							? theme.colors.dark[6]
							: 'transparent',
					transition: 'background-color 100ms ease',
					cursor: isDraggable ? 'grab' : 'pointer',
					opacity: dragState.isDragging && dragState.item === item ? 0.5 : 1,
				}}
			>
				{/* Grid Lines */}
				{level > 0 && (
					<div style={{ position: 'absolute', top: 0, bottom: 0, left: 0 }}>
						{Array.from({ length: level }).map((_, index) => (
							<div
								key={index}
								style={{
									position: 'absolute',
									left: index * INDENT_SIZE + INDENT_SIZE / 2,
									top: 0,
									bottom: isLastChild && index === level - 1 ? '50%' : 0,
									width: 1,
									backgroundColor: GRID_LINE_COLOR,
								}}
							/>
						))}
						{/* Horizontal connector */}
						<div
							style={{
								position: 'absolute',
								left: (level - 1) * INDENT_SIZE + INDENT_SIZE / 2,
								width: INDENT_SIZE / 2,
								top: '50%',
								height: 1,
								backgroundColor: GRID_LINE_COLOR,
							}}
						/>
					</div>
				)}

				{/* Content */}
				<Group
					wrap="nowrap"
					gap={8}
					style={{
						height: '100%',
						paddingLeft: level * INDENT_SIZE + BASE_PADDING,
					}}
				>
					{/* Arrow icon for expandable items */}
					<div
						style={{
							width: ICON_SIZE,
							visibility: hasChildren(item) ? 'visible' : 'hidden',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: isHovered ? theme.colors.blue[4] : theme.colors.gray[5],
							transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
							transition: 'transform 100ms ease, color 100ms ease',
						}}
					>
						<ChevronDown size={14} />
					</div>

					{/* Item type icon */}
					<div
						style={{
							width: ICON_SIZE,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: theme.colors.blue[4],
						}}
					>
						{getIcon()}
					</div>

					{/* Item name */}
					<Text
						size="sm"
						style={{
							color: isSelected ? theme.white : isHovered ? theme.colors.gray[1] : theme.colors.gray[4],
							transition: 'color 100ms ease',
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							userSelect: 'none',
						}}
					>
						{item.name}
					</Text>
				</Group>
			</UnstyledButton>

			{/* Children */}
			{hasChildren(item) &&
				isOpen &&
				getChildren(item).map((child, index, arr) => (
					<AssetTreeItem
						key={child.id}
						item={child}
						level={level + 1}
						onToggle={onToggle}
						onSelect={onSelect}
						onContextMenu={onContextMenu}
						isSelected={assetsSelectionSnap.includes(child.id)}
						isLastChild={index === arr.length - 1}
						isOpen={openFolders.has(child.id)}
						openFolders={openFolders}
					/>
				))}
		</Stack>
	)
}
