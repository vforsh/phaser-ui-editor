import {
	canChangeOrigin,
	canChangeScale,
	EditableObjectJson,
} from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { isPositionLockedForObjectJson } from '@components/canvas/phaser/scenes/main/objects/editing/editRestrictions'
import { NumberInputCustom } from '@components/inspector/sections/common/NumberInputCustom'
import { findParentContainerId } from '@components/inspector/utils/findParentContainerId'
import { Group, Stack, Tooltip, Box } from '@mantine/core'
import { state } from '@state/State'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'

interface TransformSectionProps extends BaseSectionProps<EditableObjectJson> {}

export function TransformSection({ data }: TransformSectionProps) {
	const snap = useSnapshot(data)
	const canvasSnap = useSnapshot(state.canvas)

	const parentId = findParentContainerId(canvasSnap.root as any, data.id)
	const parent = parentId ? (canvasSnap.objectById(parentId) as EditableContainerJson | undefined) : undefined
	const positionLock = isPositionLockedForObjectJson(data, parent)

	const renderXInput = () => (
		<NumberInputCustom
			label="X"
			value={snap.x}
			onChange={(val) => (data.x = val)}
			decimalScale={2}
			size="xs"
			disabled={!!positionLock}
		/>
	)

	const renderYInput = () => (
		<NumberInputCustom
			label="Y"
			value={snap.y}
			onChange={(val) => (data.y = val)}
			decimalScale={2}
			size="xs"
			disabled={!!positionLock}
		/>
	)

	return (
		<Stack gap="xs">
			<Group grow>
				<Tooltip
					label={positionLock?.reason}
					disabled={!positionLock}
					withArrow
					position="top"
					openDelay={200}
				>
					<Box>{renderXInput()}</Box>
				</Tooltip>
				<Tooltip
					label={positionLock?.reason}
					disabled={!positionLock}
					withArrow
					position="top"
					openDelay={200}
				>
					<Box>{renderYInput()}</Box>
				</Tooltip>
			</Group>

			<Group grow>
				<NumberInputCustom
					label="Origin X"
					value={snap.originX}
					onChange={(val) => (data.originX = val)}
					decimalScale={2}
					min={0}
					max={1}
					step={0.01}
					size="xs"
					disabled={!canChangeOrigin(data.type)}
				/>
				<NumberInputCustom
					label="Origin Y"
					value={snap.originY}
					onChange={(val) => (data.originY = val)}
					decimalScale={2}
					min={0}
					max={1}
					step={0.01}
					size="xs"
					disabled={!canChangeOrigin(data.type)}
				/>
			</Group>

			<Group grow>
				<NumberInputCustom
					label="Scale X"
					value={snap.scale.x}
					onChange={(val) => (data.scale.x = val)}
					decimalScale={2}
					min={0}
					step={0.01}
					size="xs"
					disabled={!canChangeScale(data.type)}
				/>
				<NumberInputCustom
					label="Scale Y"
					value={snap.scale.y}
					onChange={(val) => (data.scale.y = val)}
					decimalScale={2}
					min={0}
					step={0.01}
					size="xs"
					disabled={!canChangeScale(data.type)}
				/>
			</Group>

			<NumberInputCustom
				label="Angle"
				value={snap.angle}
				onChange={(val) => (data.angle = val)}
				decimalScale={0}
				min={-180}
				max={180}
				step={1}
				size="xs"
			/>
		</Stack>
	)
}
