import { Box, Group, Modal, ScrollArea, Stack } from '@mantine/core'
import { Boxes, Code, Cog, FolderOpen, Layers, Palette, Settings as SettingsIcon } from 'lucide-react'
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
	{ id: 'general', label: 'General', icon: Cog },
	{ id: 'hierarchy', label: 'Hierarchy', icon: Layers },
	{ id: 'canvas', label: 'Canvas', icon: Palette },
	{ id: 'assets', label: 'Assets', icon: FolderOpen },
	{ id: 'inspector', label: 'Inspector', icon: Boxes },
	{ id: 'dev', label: 'Dev', icon: Code },
	{ id: 'misc', label: 'Misc', icon: SettingsIcon },
]

const modalSize = 1080
const contentHeight = 624

interface SettingsModalProps {
	opened: boolean
	onClose: () => void
	activeSectionId: SettingsSectionId
	onSectionChange: (sectionId: SettingsSectionId) => void
}

const MODAL_TITLE = (
	<Group gap="xs">
		<SettingsIcon size={20} />
		Settings
	</Group>
)

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
		<Modal
			opened={opened}
			onClose={onClose}
			title={MODAL_TITLE}
			size={modalSize}
			centered
			transitionProps={{ duration: 100 }}
		>
			<Group align="stretch" gap={0} wrap="nowrap">
				<Box
					w={240}
					h={contentHeight}
					style={{
						backgroundColor: 'var(--mantine-color-dark-8)',
						borderRadius: 'var(--mantine-radius-md)',
					}}
				>
					<SettingsNav sections={sections} activeSectionId={activeSectionId} onSelect={onSectionChange} />
				</Box>
				<Box style={{ flex: 1, minWidth: 0 }}>
					<ScrollArea h={contentHeight} offsetScrollbars>
						<Stack gap="lg" p="xl">
							{content}
						</Stack>
					</ScrollArea>
				</Box>
			</Group>
		</Modal>
	)
}
