import { ActionIcon, Box, Title, Tooltip, useMantineTheme } from '@mantine/core'
import { Save } from 'lucide-react'

interface HierarchyPanelTitleProps {
	title: string
	hasUnsavedChanges: boolean
	onSave: () => void
}

export const HierarchyPanelTitle = ({ title, hasUnsavedChanges, onSave }: HierarchyPanelTitleProps) => {
	const theme = useMantineTheme()

	return (
		<Box w="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
			<Title order={5} ml="4px" ta="left">
				{title}
				{hasUnsavedChanges ? ' *' : ''}
			</Title>
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
		</Box>
	)
} 