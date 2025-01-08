import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { Stack } from '@mantine/core'
import { Logger } from 'tslog'
import { useInspectorSections } from '../../hooks/useInspectorSections'
import type { AssetTreeItemData } from '../../types/assets'
import { InspectorSection } from './InspectorSection'
import { NoSelection } from './NoSelection'

export type AssetToInspect = { type: 'asset'; data: AssetTreeItemData }
export type ObjectToInspect = { type: 'object'; data: EditableObjectJson }
export type ItemToInspect = AssetToInspect | ObjectToInspect

interface InspectorPanelProps {
	logger: Logger<{}>
	item: ItemToInspect | null
}

export default function InspectorPanel({ logger, item: selectedItem }: InspectorPanelProps) {
	if (!selectedItem) {
		return (
			<Stack gap="xs" p="xs">
				<NoSelection />
			</Stack>
		)
	}

	const sections = useInspectorSections(selectedItem)

	return (
		<Stack gap="xs" p="xs">
			{sections.map((section) => (
				<InspectorSection
					key={section.id}
					title={section.title}
					icon={section.icon}
					content={section.content}
					defaultExpanded={section.defaultExpanded}
				/>
			))}
		</Stack>
	)
}
