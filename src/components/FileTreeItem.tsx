import { Group, Stack, Text, UnstyledButton, useMantineTheme } from '@mantine/core'
import { ChevronDown, FileImage, FileJson, Folder } from 'lucide-react'
import { useState } from 'react'
import { useDragAndDrop } from '../hooks/useDragAndDrop'
import type { FileItem } from '../types/files'

const TRANSITION_DURATION = '100ms'
const TRANSITION_TIMING = `all ${TRANSITION_DURATION} cubic-bezier(0.4, 0, 0.2, 1)`
const INDENT_SIZE = 26
const ICON_MARGIN = 8

interface FileTreeItemProps {
	item: FileItem
	level?: number
	onToggle: (item: FileItem) => void
	onSelect: (item: FileItem) => void
	onContextMenu: (item: FileItem, position: { x: number; y: number }) => void
	selectedItem?: FileItem | null
	isLastChild?: boolean
}

export default function FileTreeItem({ item, level = 0, onToggle, onSelect, onContextMenu, selectedItem, isLastChild = false }: FileTreeItemProps) {
	const [isHovered, setIsHovered] = useState(false)
	const theme = useMantineTheme()
	const isSelected = selectedItem === item
	const { handleDragStart, handleDragEnd } = useDragAndDrop()

	const getIcon = () => {
		switch (item.type) {
			case 'folder':
				return <Folder size={16} />
			case 'json':
				return <FileJson size={16} />
			case 'image':
				return <FileImage size={16} />
		}
	}

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault()
		if (item.type === 'folder') {
			onToggle(item)
		} else {
			onSelect(item)
		}
	}

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault()
		onContextMenu(item, { x: e.clientX, y: e.clientY })
	}

	return (
		<Stack gap={0}>
			<UnstyledButton
				onClick={handleClick}
				onContextMenu={handleContextMenu}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				draggable={item.type === 'image'}
				onDragStart={(e) => handleDragStart(item, e)}
				onDragEnd={handleDragEnd}
				py="xs"
				style={{
					paddingLeft: level * INDENT_SIZE + ICON_MARGIN,
					borderRadius: theme.radius.sm,
					backgroundColor: isSelected ? theme.colors.dark[5] : isHovered ? theme.colors.dark[6] : 'transparent',
					transition: TRANSITION_TIMING,
					position: 'relative',
					width: '100%',
					cursor: item.type === 'image' ? 'grab' : 'pointer',
				}}
			>
				{/* Vertical grid lines */}
				{level > 0 &&
					Array.from({ length: level }).map((_, index) => (
						<div
							key={index}
							style={{
								position: 'absolute',
								left: index * INDENT_SIZE + ICON_MARGIN * 2,
								top: 0,
								bottom: isLastChild && index === level - 1 ? '50%' : 0,
								width: '1px',
								backgroundColor: theme.colors.dark[2],
								opacity: 0.33,
							}}
						/>
					))}

				{/* Horizontal connector line */}
				{level > 0 && (
					<div
						style={{
							position: 'absolute',
							left: (level - 1) * INDENT_SIZE + ICON_MARGIN * 2,
							top: '50%',
							width: INDENT_SIZE - ICON_MARGIN,
							height: '1px',
							backgroundColor: theme.colors.dark[2],
							opacity: 0.33,
						}}
					/>
				)}

				<Group gap="xs" wrap="nowrap">
					{item.type === 'folder' && (
						<div
							style={{
								transition: TRANSITION_TIMING,
								transform: item.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
								color: isHovered ? theme.colors.blue[4] : 'inherit',
								width: 16,
								height: 16,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<ChevronDown size={14} />
						</div>
					)}
					<div
						style={{
							transition: TRANSITION_TIMING,
							color: isSelected || isHovered ? theme.colors.blue[4] : theme.colors.blue[4],
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
							color: isSelected || isHovered ? theme.white : theme.colors.gray[4],
							transition: TRANSITION_TIMING,
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{item.name}
					</Text>
				</Group>
			</UnstyledButton>

			{item.type === 'folder' &&
				item.isOpen &&
				item.children?.map((child, index, arr) => (
					<FileTreeItem
						key={child.name + index}
						item={child}
						level={level + 1}
						onToggle={onToggle}
						onSelect={onSelect}
						onContextMenu={onContextMenu}
						selectedItem={selectedItem}
						isLastChild={index === arr.length - 1}
					/>
				))}
		</Stack>
	)
}
