import { Paper, ScrollArea, Stack } from '@mantine/core'
import { state, useSnapshot } from '@state/State'
import { Logger } from 'tslog'
import { PanelTitle } from '../PanelTitle'
import HierarchyItem from './HierarchyItem'

export type HierarchyPanelProps = {
	logger: Logger<{}>
}

export default function HierarchyPanel(props: HierarchyPanelProps) {
	const { logger } = props

	const canvasSnap = useSnapshot(state.canvas.objects!)

	// TODO implement selection and hover for hierarchy panel
	const isSelected = false
	const isHovered = false

	return (
		<Paper style={{ height: '100%', display: 'flex', flexDirection: 'column' }} radius="sm">
			<Stack gap="xs" p="xs" style={{ height: '100%', minHeight: 0 }}>
				<PanelTitle title="Hierarchy" />
				<ScrollArea style={{ flex: 1 }}>
					<Stack gap={0}>
						{canvasSnap && (
							<HierarchyItem
								key={canvasSnap.id}
								obj={canvasSnap}
								isLastChild={true}
								isSelected={isSelected}
								isHovered={isHovered}
							/>
						)}
					</Stack>
				</ScrollArea>
			</Stack>
		</Paper>
	)
}
