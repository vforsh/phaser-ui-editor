import { Box, Group, Modal, ScrollArea, Stack, Title } from '@mantine/core'
import { match } from 'ts-pattern'
import type { SettingsSectionId } from '../../settings/EditorSettings'
import { SettingsNav, type SettingsNavSection } from './SettingsNav'
import { AssetsSection } from './sections/AssetsSection'
import { CanvasSection } from './sections/CanvasSection'
import { DevSection } from './sections/DevSection'
import { GeneralSection } from './sections/GeneralSection'
import { HierarchySection } from './sections/HierarchySection'
import { InspectorSection } from './sections/InspectorSection'
import { MiscSection } from './sections/MiscSection'

const sections: SettingsNavSection[] = [
	{ id: 'general', label: 'General' },
	{ id: 'hierarchy', label: 'Hierarchy' },
	{ id: 'canvas', label: 'Canvas' },
	{ id: 'assets', label: 'Assets' },
	{ id: 'inspector', label: 'Inspector' },
	{ id: 'dev', label: 'Dev' },
	{ id: 'misc', label: 'Misc' },
]

const modalSize = 900
const contentHeight = 520

interface SettingsModalProps {
	opened: boolean
	onClose: () => void
	activeSectionId: SettingsSectionId
	onSectionChange: (sectionId: SettingsSectionId) => void
}

export function SettingsModal({ opened, onClose, activeSectionId, onSectionChange }: SettingsModalProps) {
	const content = match(activeSectionId)
		.with('general', () => <GeneralSection />)
		.with('hierarchy', () => <HierarchySection />)
		.with('canvas', () => <CanvasSection />)
		.with('assets', () => <AssetsSection />)
		.with('inspector', () => <InspectorSection />)
		.with('dev', () => <DevSection />)
		.with('misc', () => <MiscSection />)
		.exhaustive()

	return (
		<Modal opened={opened} onClose={onClose} title="Settings" size={modalSize} centered>
			<Group align="stretch" gap="lg" wrap="nowrap">
				<Box w={180} h={contentHeight}>
					<SettingsNav
						sections={sections}
						activeSectionId={activeSectionId}
						onSelect={onSectionChange}
					/>
				</Box>
				<Box style={{ flex: 1, minWidth: 0 }}>
					<ScrollArea h={contentHeight} offsetScrollbars>
						<Stack gap="md" p="md">
							<Title order={3}>
								{sections.find((section) => section.id === activeSectionId)?.label}
							</Title>
							{content}
						</Stack>
					</ScrollArea>
				</Box>
			</Group>
		</Modal>
	)
}
