import {
	canChangeOrigin,
	canChangeScale,
	EditableObjectJson,
} from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { NumberInputCustom } from '@components/inspector/sections/common/NumberInputCustom'
import { Group, Stack } from '@mantine/core'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'

interface TransformSectionProps extends BaseSectionProps<EditableObjectJson> {}

export function TransformSection({ data }: TransformSectionProps) {
	const snap = useSnapshot(data)

	return (
		<Stack gap="xs">
			<Group grow>
				<NumberInputCustom
					label="X"
					value={snap.x}
					onChange={(val) => (data.x = val)}
					decimalScale={2}
					size="xs"
				/>
				<NumberInputCustom
					label="Y"
					value={snap.y}
					onChange={(val) => (data.y = val)}
					decimalScale={2}
					size="xs"
				/>
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
