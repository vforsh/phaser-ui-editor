import { Divider, Paper, ScrollArea, Stack } from '@mantine/core'
import { state, useSnapshot } from '@state/State'
import { Logger } from 'tslog'
import { PanelTitle } from '../PanelTitle'
import HierarchyItem from './HierarchyItem'

export type HierarchyPanelProps = {
	logger: Logger<{}>
}

export default function HierarchyPanel(props: HierarchyPanelProps) {
	const { logger } = props

	const canvasSnap = useSnapshot(state.canvas)

	const rootState = canvasSnap.root && state.canvas.objectById(canvasSnap.root.id)

	return (
		<Paper style={{ height: '100%', display: 'flex', flexDirection: 'column' }} radius="sm">
			<Stack gap="xs" p="xs" style={{ height: '100%', minHeight: 0 }}>
				<PanelTitle title="Hierarchy" />
				<Divider />
				<ScrollArea style={{ flex: 1 }}>
					<Stack gap={0}>
						{rootState && (
							<HierarchyItem
								key={rootState.id}
								objState={rootState}
								hasUnsavedChanges={canvasSnap.hasUnsavedChanges}
								selectedIds={canvasSnap.selection}
								hoveredIds={canvasSnap.hover}
								isLastChild={true}
								isRoot={true}
								activeEditContextId={canvasSnap.activeContextId}
							/>
						)}
					</Stack>
				</ScrollArea>
			</Stack>
		</Paper>
	)
}
