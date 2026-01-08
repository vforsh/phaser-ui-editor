import { ScrollArea, Stack } from '@mantine/core'
import { ReactNode } from 'react'

import { InspectorSection, InspectorSectionDef } from './InspectorSection'

interface InspectorSectionsScrollAreaProps {
	sections: InspectorSectionDef[]
	renderSection?: (section: InspectorSectionDef) => ReactNode
	footer?: ReactNode
}

export function InspectorSectionsScrollArea({ sections, renderSection, footer }: InspectorSectionsScrollAreaProps) {
	return (
		<ScrollArea style={{ flex: 1, minWidth: 0, maxHeight: '100%', overflowY: 'auto' }} type="always" scrollbarSize={8} offsetScrollbars>
			<Stack gap="xs" p="xs">
				{sections.map((section) => {
					if (renderSection) {
						return renderSection(section)
					}

					return (
						<InspectorSection
							key={section.type}
							type={section.type}
							title={section.title}
							icon={section.icon}
							content={section.content}
							defaultExpanded={section.defaultExpanded}
						/>
					)
				})}
				{footer}
			</Stack>
		</ScrollArea>
	)
}
