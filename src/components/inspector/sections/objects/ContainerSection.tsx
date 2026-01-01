import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { Button, Stack, Tooltip } from '@mantine/core'
import { Info } from 'lucide-react'
import { useSnapshot } from 'valtio'
import { useAppCommands } from '../../../../di/DiContext'
import { BaseSectionProps } from '../BaseSection'

interface ContainerSectionProps extends BaseSectionProps<EditableContainerJson> {}

export function ContainerSection({ data }: ContainerSectionProps) {
	const snap = useSnapshot(data)
	const appCommands = useAppCommands()
	const hasChildren = snap.children.length > 0

	return (
		<Stack gap="xs">
			<Button
				variant="light"
				size="xs"
				mt="xs"
				disabled={!hasChildren}
				onClick={() => appCommands.emit('adjust-container-to-children-bounds', { objectId: data.id })}
				rightSection={
					<Tooltip label="Adjusts the container size to the union of its children's bounds.">
						<Info size={14} />
					</Tooltip>
				}
			>
				Adjust to Children Bounds
			</Button>
		</Stack>
	)
}
