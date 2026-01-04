import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { isSizeLockedForObjectJson } from '@components/canvas/phaser/scenes/main/objects/editing/editRestrictions'
import { NumberInputCustom } from '@components/inspector/sections/common/NumberInputCustom'
import { Box, Button, Group, Stack, Tooltip } from '@mantine/core'
import { Info } from 'lucide-react'
import { useSnapshot } from 'valtio'

import { useAppCommands } from '../../../../di/DiHooks'
import { BaseSectionProps } from '../BaseSection'

interface ContainerSizeSectionProps extends BaseSectionProps<EditableContainerJson> {}

const ADJUST_BOUNDS_TOOLTIP = (
	<Tooltip label="Adjusts the container size to the union of its children's bounds.">
		<Info size={14} />
	</Tooltip>
)

export function ContainerSizeSection({ data }: ContainerSizeSectionProps) {
	const snap = useSnapshot(data)
	const appCommands = useAppCommands()
	const hasChildren = snap.children.length > 0

	const sizeLock = isSizeLockedForObjectJson(data)

	return (
		<Stack gap="xs">
			<Group grow>
				<Tooltip label={sizeLock?.reason} disabled={!sizeLock} withArrow position="top" openDelay={200}>
					<Box>
						<NumberInputCustom
							label="Width"
							value={snap.width}
							onChange={(val) => (data.width = val)}
							size="xs"
							decimalScale={2}
							disabled={!!sizeLock}
						/>
					</Box>
				</Tooltip>
				<Tooltip label={sizeLock?.reason} disabled={!sizeLock} withArrow position="top" openDelay={200}>
					<Box>
						<NumberInputCustom
							label="Height"
							value={snap.height}
							onChange={(val) => (data.height = val)}
							size="xs"
							decimalScale={2}
							disabled={!!sizeLock}
						/>
					</Box>
				</Tooltip>
			</Group>

			<Button
				variant="light"
				size="xs"
				mt="xs"
				disabled={!hasChildren}
				onClick={() => appCommands.emit('adjust-container-to-children-bounds', { objectId: data.id })}
				rightSection={ADJUST_BOUNDS_TOOLTIP}
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
