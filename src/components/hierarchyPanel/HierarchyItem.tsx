import { ActionIcon, alpha, Group, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { state } from '@state/State'
import { ChevronDown, Eye, EyeOff, Folder, Image, ImageUpscale, Lock, TextQuote, Type, Unlock } from 'lucide-react'
import { useState } from 'react'
import { match } from 'ts-pattern'
import { useSnapshot } from 'valtio'

const INDENT_SIZE = 26
const ICON_MARGIN = 8

interface HierarchyItemProps {
	objId: string
	level?: number
	selectedIds: readonly string[]
	hoveredIds: readonly string[]
	isLastChild?: Boolean
	isHovered?: boolean
	isOpened?: boolean
}

export default function HierarchyItem({
	objId,
	selectedIds,
	hoveredIds,
	level = 0,
	isLastChild = false,
	isHovered: isHoveredInitially = false,
	isOpened: isOpenedInitially = true,
}: HierarchyItemProps) {
	const stateObj = state.canvas.objectById?.(objId)
	if (!stateObj) {
		return <></>
	}

	const theme = useMantineTheme()
	const [isOpen, setIsOpen] = useState(isOpenedInitially)
	const [isHovered, setIsHovered] = useState(isHoveredInitially)
	const snap = useSnapshot(stateObj)
	const isSelectedInCanvas = selectedIds.includes(objId)
	const isHoveredInCanvas = hoveredIds.includes(objId)

	const getIcon = () => {
		return match(snap)
			.with({ type: 'Container' }, () => <Folder size={16} />)
			.with({ type: 'Image' }, () => <Image size={16} />)
			.with({ type: 'NineSlice' }, () => <ImageUpscale size={16} />)
			.with({ type: 'BitmapText' }, () => <Type size={16} />)
			.with({ type: 'Text' }, () => <TextQuote size={16} />)
			.exhaustive()
	}

	const handleToggle = () => {
		if (snap.type === 'Container') {
			setIsOpen(!isOpen)
		}
	}

	const setItemVisibility = (visible: boolean) => {
		stateObj!.visible = visible
	}

	const setItemLock = (locked: boolean) => {
		stateObj!.locked = locked
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
					{snap.type === 'Container' && (
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
							opacity: snap.visible ? 1 : 0.5,
							userSelect: 'none',
						}}
					>
						{snap.name}
					</Text>

					<Tooltip label={snap.visible ? 'Hide' : 'Show'}>
						<ActionIcon
							variant="subtle"
							size="sm"
							color={theme.colors.gray[5]}
							onClick={(e) => {
								e.stopPropagation()
								setItemVisibility(!snap.visible)
							}}
							style={{
								marginLeft: 'auto',
								opacity: isHovered ? 1 : 0,
								transition: 'opacity 33ms ease',
							}}
						>
							{snap.visible ? <Eye size={14} /> : <EyeOff size={14} />}
						</ActionIcon>
					</Tooltip>

					<Tooltip label={snap.locked ? 'Unlock' : 'Lock'}>
						<ActionIcon
							variant="subtle"
							size="sm"
							color={theme.colors.gray[5]}
							onClick={(e) => {
								e.stopPropagation()
								setItemLock(!snap.locked)
							}}
							style={{
								marginRight: '10px',
								opacity: snap.locked ? 1 : isHovered ? 1 : 0,
								transition: 'opacity 33ms ease',
							}}
						>
							{snap.locked ? <Lock size={14} /> : <Unlock size={14} />}
						</ActionIcon>
					</Tooltip>
				</Group>
			</div>

			{snap.type === 'Container' &&
				isOpen &&
				snap.children?.map((child, index, arr) => (
					<HierarchyItem
						key={child.id}
						objId={child.id}
						level={level + 1}
						selectedIds={selectedIds}
						hoveredIds={hoveredIds}
						isLastChild={index === arr.length - 1}
					/>
				))}
		</>
	)
}
