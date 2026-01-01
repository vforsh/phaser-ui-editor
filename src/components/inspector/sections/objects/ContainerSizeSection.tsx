import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { NumberInputCustom } from '@components/inspector/sections/common/NumberInputCustom'
import { useAppCommands } from '../../../../di/DiContext'
import { Button, Group, Stack, Tooltip } from '@mantine/core'
import { Info } from 'lucide-react'
import { match } from 'ts-pattern'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'

interface ContainerSizeSectionProps extends BaseSectionProps<EditableContainerJson> {}

export function ContainerSizeSection({ data }: ContainerSizeSectionProps) {
	const snap = useSnapshot(data)
	const appCommands = useAppCommands()
	const hasChildren = snap.children.length > 0

	const hasActiveSizeControllingComps = snap.components.some((comp) =>
		match(comp.type)
			.with('horizontal-layout', 'vertical-layout', 'grid-layout', () => comp.active)
			.otherwise(() => false)
	)

	return (
		<Stack gap="xs">
			<Group grow>
				<NumberInputCustom
					label="Width"
					value={snap.width}
					onChange={(val) => (data.width = val)}
					size="xs"
					decimalScale={2}
					// TODO add tooltip that explains that the width is controlled by the layout component
					readOnly={hasActiveSizeControllingComps}
				/>
				<NumberInputCustom
					label="Height"
					value={snap.height}
					onChange={(val) => (data.height = val)}
					size="xs"
					decimalScale={2}
					// TODO add tooltip that explains that the height is controlled by the layout component
					readOnly={hasActiveSizeControllingComps}
				/>
			</Group>

			<Button
				variant='light'
				size='xs'
				mt='xs'
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

			{/* <Group grow>
				<NumberInputCustom
					label="Display Width"
					value={snap.displayWidth}
					onChange={(val) => (data.displayWidth = val)}
					min={0}
					size="xs"
					readOnly
				/>
				<NumberInputCustom
					label="Display Height"
					value={snap.displayHeight}
					onChange={(val) => (data.displayHeight = val)}
					min={0}
					size="xs"
					readOnly
				/>
			</Group> */}
		</Stack>
	)
}
