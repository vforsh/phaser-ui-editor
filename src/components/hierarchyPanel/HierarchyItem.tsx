import { ActionIcon, Group, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { ChevronDown, Eye, EyeOff, Folder, Image, Lock, TextQuote, Type, Unlock } from 'lucide-react'
import { useState } from 'react'
import { match } from 'ts-pattern'
import type { HierarchyItemData } from '../../types/hierarchy'

const INDENT_SIZE = 26
const ICON_MARGIN = 8

interface HierarchyItemProps {
	item: HierarchyItemData
	level?: number
	isLastChild?: Boolean
	isSelected?: boolean
	isHovered?: boolean
	isOpened?: boolean
	setItemVisibility: (path: string, visible: boolean) => void
	setItemLock: (path: string, locked: boolean) => void
}

export default function HierarchyItem({
	item,
	level = 0,
	isLastChild = false,
	isSelected = false,
	isHovered: isHoveredInitially = false,
	isOpened: isOpenedInitially = true,
	setItemVisibility,
	setItemLock,
}: HierarchyItemProps) {
	const [isOpen, setIsOpen] = useState(isOpenedInitially)
	const [isHovered, setIsHovered] = useState(isHoveredInitially)
	const theme = useMantineTheme()

	const getIcon = () => {
		return match(item)
			.with({ type: 'Container' }, () => <Folder size={16} />)
			.with({ type: 'Image' }, () => <Image size={16} />)
			.with({ type: 'BitmapText' }, () => <Type size={16} />)
			.with({ type: 'Text' }, () => <TextQuote size={16} />)
			.exhaustive()
	}

	const handleToggle = () => {
		if (item.type === 'Container') {
			setIsOpen(!isOpen)
		}
	}
	
	const gridLineThickness = 1

	return (
		<>
			<div
				onClick={handleToggle}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				style={{
					padding: '0.5rem 0',
					paddingLeft: level * INDENT_SIZE + ICON_MARGIN,
					borderRadius: theme.radius.sm,
					backgroundColor: isSelected
						? theme.colors.blue[9]
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
								backgroundColor: theme.colors.dark[2],
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
							width: INDENT_SIZE - ICON_MARGIN,
							height: `${gridLineThickness}px`,
							backgroundColor: theme.colors.dark[2],
							opacity: 0.33,
						}}
					/>
				)}

				<Group gap="xs" wrap="nowrap">
					{item.type === 'Container' && (
						<div
							style={{
								transition: 'transform 33ms ease',
								transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
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
							opacity: item.visible ? 1 : 0.5,
							userSelect: 'none',
						}}
					>
						{item.name}
					</Text>

					<Tooltip label={item.visible ? 'Hide' : 'Show'}>
						<ActionIcon
							variant="subtle"
							size="sm"
							onClick={(e) => {
								e.stopPropagation()
								setItemVisibility(item.path, !item.visible)
							}}
							style={{
								marginLeft: 'auto',
								opacity: isHovered ? 1 : 0,
								transition: 'opacity 33ms ease',
							}}
						>
							{item.visible ? <Eye size={14} /> : <EyeOff size={14} />}
						</ActionIcon>
					</Tooltip>

					<Tooltip label={item.locked ? 'Unlock' : 'Lock'}>
						<ActionIcon
							variant="subtle"
							size="sm"
							onClick={(e) => {
								e.stopPropagation()
								setItemLock(item.path, !item.locked)
							}}
							style={{
								marginRight: '10px',
								opacity: item.locked ? 1 : isHovered ? 1 : 0,
								transition: 'opacity 33ms ease',
							}}
						>
							{item.locked ? <Lock size={14} /> : <Unlock size={14} />}
						</ActionIcon>
					</Tooltip>
				</Group>
			</div>

			{item.type === 'Container' &&
				isOpen &&
				item.children?.map((child, index, arr) => (
					<HierarchyItem
						key={child.path}
						item={child}
						level={level + 1}
						isLastChild={index === arr.length - 1}
						setItemVisibility={setItemVisibility}
						setItemLock={setItemLock}
						isSelected={child.isSelected}
						isHovered={child.isHovered}
					/>
				))}
		</>
	)
}
