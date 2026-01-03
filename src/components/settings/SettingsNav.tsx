import { Stack, Text, UnstyledButton } from '@mantine/core'
import type { SettingsSectionId } from '../../settings/EditorSettings'
import classes from './SettingsNav.module.css'

export type SettingsNavSection = {
	id: SettingsSectionId
	label: string
}

interface SettingsNavProps {
	sections: SettingsNavSection[]
	activeSectionId: SettingsSectionId
	onSelect: (sectionId: SettingsSectionId) => void
}

export function SettingsNav({ sections, activeSectionId, onSelect }: SettingsNavProps) {
	return (
		<Stack gap={4}>
			{sections.map((section) => {
				const isActive = section.id === activeSectionId
				return (
					<UnstyledButton
						key={section.id}
						onClick={() => onSelect(section.id)}
						className={`${classes.button} ${isActive ? classes.buttonActive : ''}`}
					>
						<Text size="sm" fw={isActive ? 600 : 500}>
							{section.label}
						</Text>
					</UnstyledButton>
				)
			})}
		</Stack>
	)
}
