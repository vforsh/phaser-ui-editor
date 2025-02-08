import { EditableComponentJson } from '@components/canvas/phaser/scenes/main/objects/components/EditableComponent'
import {
	ActionIcon,
	Box,
	Checkbox,
	Collapse,
	Group,
	Menu,
	Text,
	Tooltip,
	UnstyledButton,
	useMantineTheme,
} from '@mantine/core'
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
				<Menu.Item leftSection={<RotateCcw size={16} />} onClick={onReset}>
					Reset
				</Menu.Item>
				<Menu.Divider />
				<Menu.Item leftSection={<ChevronRight size={16} className="rotate-[-90deg]" />} onClick={onMoveUp}>
					Move up
				</Menu.Item>
				<Menu.Item leftSection={<ChevronRight size={16} className="rotate-90" />} onClick={onMoveDown}>
					Move down
				</Menu.Item>
				<Menu.Item leftSection={<Trash size={16} />} onClick={onRemove} color="red">
					Remove
				</Menu.Item>
				<Menu.Divider />
				<Menu.Item leftSection={<Copy size={16} />} onClick={onCopy}>
					Copy
				</Menu.Item>
				<Menu.Item leftSection={<ClipboardPaste size={16} />} onClick={onPaste}>
					Paste
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	)
}

interface ComponentSectionProps extends BaseSectionProps<EditableComponentJson> {
	content: React.ReactNode
}

export function ComponentSection({ data, content }: ComponentSectionProps) {
	const type = data.type
	const theme = useMantineTheme()
	const [expanded, setExpanded] = useState(true)
	const componentInfo = ComponentsListData[type]
	const snap = useSnapshot(data)
	const Icon = componentInfo.icon

	return (
		<Box>
			<UnstyledButton onClick={() => setExpanded(!expanded)} className={sectionClasses.button}>
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
								<HelpCircle
									size={16}
									color={!snap.active ? theme.colors.dark[2] : theme.colors.gray[5]}
								/>
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
							onReset={() => {
								// TODO: Implement reset functionality
							}}
							onMoveUp={() => {
								// TODO: Implement move up functionality
							}}
							onMoveDown={() => {
								// TODO: Implement move down functionality
							}}
							onRemove={() => {
								// TODO: Implement remove functionality
							}}
							onCopy={() => {
								// TODO: Implement copy functionality
							}}
							onPaste={() => {
								// TODO: Implement paste functionality
							}}
						/>
					</Group>
				</Group>
			</UnstyledButton>

			<Collapse in={expanded} transitionDuration={30}>
				<Box pt="xs" pb="sm" px="sm">
					{content}
				</Box>
			</Collapse>
		</Box>
	)
}
