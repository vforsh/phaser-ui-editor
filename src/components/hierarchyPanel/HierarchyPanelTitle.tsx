import { ActionIcon, Box, Group, Title, Tooltip, UnstyledButton, useMantineTheme } from '@mantine/core'
import { state } from '@state/State'
import { Save, Undo2 } from 'lucide-react'
import styles from './HierarchyPanelTitle.module.css'

interface HierarchyPanelTitleProps {
	title: string
	prefabAssetId?: string
	hasUnsavedChanges: boolean
	onSave: () => void
	onDiscard: () => void
}

export const HierarchyPanelTitle = ({
	title,
	prefabAssetId,
	hasUnsavedChanges,
	onSave,
	onDiscard,
}: HierarchyPanelTitleProps) => {
	const theme = useMantineTheme()

	const handleTitleClick = () => {
		if (!prefabAssetId) {
			return
		}

		state.assets.locateAsset?.(prefabAssetId)
		state.assets.focusPanel?.()
	}

	return (
		<Box w="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
			<UnstyledButton
				className={`${styles.titleButton} ${prefabAssetId ? '' : styles.titleButtonDisabled}`}
				onClick={handleTitleClick}
				disabled={!prefabAssetId}
			>
				<Title order={5} ml="4px" ta="left">
					{title}
					{hasUnsavedChanges ? ' *' : ''}
				</Title>
			</UnstyledButton>
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
