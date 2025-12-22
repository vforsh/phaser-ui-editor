import { ActionIcon, Box, Group, Title, Tooltip, useMantineTheme } from '@mantine/core'
import { Save, Undo2 } from 'lucide-react'

interface HierarchyPanelTitleProps {
	title: string
	hasUnsavedChanges: boolean
	onSave: () => void
	onDiscard: () => void
}

export const HierarchyPanelTitle = ({ title, hasUnsavedChanges, onSave, onDiscard }: HierarchyPanelTitleProps) => {
	const theme = useMantineTheme()

	return (
		<Box w="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
			<Title order={5} ml="4px" ta="left">
				{title}
				{hasUnsavedChanges ? ' *' : ''}
			</Title>
			<Group gap="xs">
				<Tooltip label="Discard unsaved changes">
					<ActionIcon
						variant="subtle"
						size="md"
						color={theme.colors.gray[5]}
						disabled={!hasUnsavedChanges}
						onClick={onDiscard}
					>
						<Undo2 size={14} />
					</ActionIcon>
				</Tooltip>
				<Tooltip label="Save">
					<ActionIcon
						variant="subtle"
						size="md"
						color={theme.colors.gray[5]}
						disabled={!hasUnsavedChanges}
						onClick={onSave}
					>
						<Save size={14} />
					</ActionIcon>
				</Tooltip>
			</Group>
		</Box>
	)
}
