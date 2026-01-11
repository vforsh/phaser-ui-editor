import type { EditableComponentJson } from '@tekton/runtime'

import { ActionIcon, Box, Checkbox, Collapse, Group, Menu, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { ChevronRight, ClipboardPaste, Copy, HelpCircle, MoreVertical, RotateCcw, Trash } from 'lucide-react'
import { useState } from 'react'
import { useSnapshot } from 'valtio'

import sectionClasses from '../../InspectorSection.module.css'
import { BaseSectionProps } from '../BaseSection'
import classes from './ComponentSection.module.css'
import { ComponentsListData } from './ComponentsListData'

interface ComponentMenuProps {
	onReset: () => void
	onMoveUp: () => void
	onMoveDown: () => void
	onRemove: () => void
	onCopy: () => void
	onPaste: () => void
}

const RESET_ICON = <RotateCcw size={16} />
const MOVE_UP_ICON = <ChevronRight size={16} className="rotate-[-90deg]" />
const MOVE_DOWN_ICON = <ChevronRight size={16} className="rotate-90" />
const REMOVE_ICON = <Trash size={16} />
const COPY_ICON = <Copy size={16} />
const PASTE_ICON = <ClipboardPaste size={16} />

function ComponentMenu({ onReset, onMoveUp, onMoveDown, onRemove, onCopy, onPaste }: ComponentMenuProps) {
	const theme = useMantineTheme()
	const [opened, { open, close }] = useDisclosure(false)

	return (
		<Menu opened={opened} onOpen={open} onClose={close} position="bottom-end">
			<Menu.Target>
				<ActionIcon variant="subtle" size="sm" onClick={(e) => e.stopPropagation()}>
					<MoreVertical size={16} color={theme.colors.gray[5]} />
				</ActionIcon>
			</Menu.Target>
			<Menu.Dropdown>
				<Menu.Item leftSection={RESET_ICON} onClick={onReset}>
					Reset
				</Menu.Item>
				<Menu.Divider />
				<Menu.Item leftSection={MOVE_UP_ICON} onClick={onMoveUp}>
					Move up
				</Menu.Item>
				<Menu.Item leftSection={MOVE_DOWN_ICON} onClick={onMoveDown}>
					Move down
				</Menu.Item>
				<Menu.Item leftSection={REMOVE_ICON} onClick={onRemove} color="red">
					Remove
				</Menu.Item>
				<Menu.Divider />
				<Menu.Item leftSection={COPY_ICON} onClick={onCopy}>
					Copy
				</Menu.Item>
				<Menu.Item leftSection={PASTE_ICON} onClick={onPaste}>
					Paste
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	)
}

interface ComponentSectionProps extends BaseSectionProps<EditableComponentJson> {
	content: React.ReactNode
	onReset: () => void
	onMoveUp: () => void
	onMoveDown: () => void
	onRemove: () => void
	onCopy: () => void
	onPaste: () => void
}

export function ComponentSection({ data, content, onReset, onMoveUp, onMoveDown, onRemove, onCopy, onPaste }: ComponentSectionProps) {
	const componentType = data.type
	const theme = useMantineTheme()
	const [expanded, setExpanded] = useState(true)
	const componentInfo = ComponentsListData[componentType]
	const snap = useSnapshot(data)
	const Icon = componentInfo.icon

	return (
		<Box>
			<div
				role="button"
				tabIndex={0}
				onClick={() => setExpanded(!expanded)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						setExpanded(!expanded)
					}
				}}
				className={sectionClasses.button}
				style={{ cursor: 'pointer' }}
			>
				<Group gap="xs" justify="space-between">
					<Group gap="xs">
						<div
							style={{
								transform: `rotate(${expanded ? '90deg' : '0deg'})`,
								transition: 'transform 30ms ease',
							}}
						>
							<ChevronRight size={16} />
						</div>
						<Icon size={16} color={!snap.active ? theme.colors.dark[2] : undefined} />
						<Text size="sm" fw={500} c={!snap.active ? 'dimmed' : undefined}>
							{componentInfo.title}
						</Text>
						<Tooltip label={componentInfo?.description || 'No description available'}>
							<ActionIcon variant="subtle" size="xs" onClick={(e) => e.stopPropagation()}>
								<HelpCircle color={!snap.active ? theme.colors.dark[2] : theme.colors.gray[5]} />
							</ActionIcon>
						</Tooltip>
					</Group>
					<Group gap="xs">
						<Checkbox
							variant="outline"
							color={theme.colors.gray[5]}
							size="xs"
							checked={snap.active}
							onChange={(event) => {
								event.stopPropagation()
								data.active = event.currentTarget.checked
							}}
							onClick={(e) => e.stopPropagation()}
							classNames={{ input: classes.checkbox }}
						/>
						<ComponentMenu
							onReset={onReset}
							onMoveUp={onMoveUp}
							onMoveDown={onMoveDown}
							onRemove={onRemove}
							onCopy={onCopy}
							onPaste={onPaste}
						/>
					</Group>
				</Group>
			</div>

			<Collapse in={expanded} transitionDuration={30}>
				<Box pt="xs" pb="sm" px="sm">
					{content}
				</Box>
				{/* TODO components - add copy and remove buttons */}
			</Collapse>
		</Box>
	)
}
