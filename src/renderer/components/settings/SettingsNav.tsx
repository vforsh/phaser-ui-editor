import { Group, Stack, Text, UnstyledButton } from '@mantine/core'

import type { SettingsSectionId } from '../../settings/EditorSettings'

import classes from './SettingsNav.module.css'

export type SettingsNavSection = {
	id: SettingsSectionId
	label: string
	icon: React.ComponentType<{ size?: number | string }>
}

interface SettingsNavProps {
	sections: SettingsNavSection[]
	activeSectionId: SettingsSectionId
	onSelect: (sectionId: SettingsSectionId) => void
}

export function SettingsNav({ sections, activeSectionId, onSelect }: SettingsNavProps) {
	return (
		<Stack gap={0} style={{ width: '100%' }}>
			{sections.map((section) => {
				const isActive = section.id === activeSectionId
				const Icon = section.icon
				return (
					<UnstyledButton
						key={section.id}
						onClick={() => onSelect(section.id)}
						className={`${classes.button} ${isActive ? classes.buttonActive : ''}`}
					>
						<Group gap="xs" wrap="nowrap" style={{ width: '100%' }}>
							<span className={classes.icon}>
								<Icon size={16} />
							</span>
							<Text size="sm" fw={isActive ? 600 : 500} style={{ flex: 1 }}>
								{section.label}
							</Text>
						</Group>
					</UnstyledButton>
				)
			})}
		</Stack>
	)
}
