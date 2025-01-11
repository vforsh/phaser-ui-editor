import { Group, NumberInput, Stack } from '@mantine/core'
import { BaseSectionProps } from '../BaseSection'

export interface TransformSectionData {
	x: number
	y: number
	originX: number
	originY: number
	angle: number
	scaleX: number
	scaleY: number
}

interface TransformSectionProps extends BaseSectionProps<TransformSectionData> {}

export function TransformSection({ data, onChange }: TransformSectionProps) {
	return (
		<Stack gap="xs">
			<Group grow>
				<NumberInput
					label="X"
					value={data.x}
					onChange={(val) => onChange('x', typeof val === 'string' ? parseFloat(val) : val, data.x)}
					decimalScale={2}
					size="xs"
				/>
				<NumberInput
					label="Y"
					value={data.y}
					onChange={(val) => onChange('y', typeof val === 'string' ? parseFloat(val) : val, data.y)}
					decimalScale={2}
					size="xs"
				/>
			</Group>
			<Group grow>
				<NumberInput
					label="Origin X"
					value={data.originX}
					onChange={(val) =>
						onChange('originX', typeof val === 'string' ? parseFloat(val) : val, data.originX)
					}
					decimalScale={2}
					min={0}
					max={1}
					size="xs"
				/>
				<NumberInput
					label="Origin Y"
					value={data.originY}
					onChange={(val) =>
						onChange('originY', typeof val === 'string' ? parseFloat(val) : val, data.originY)
					}
					decimalScale={2}
					min={0}
					max={1}
					size="xs"
				/>
			</Group>
			<NumberInput
				label="Angle"
				value={data.angle}
				onChange={(val) => onChange('angle', typeof val === 'string' ? parseFloat(val) : val, data.angle)}
				min={-180}
				max={180}
				step={1}
				size="xs"
			/>
			<Group grow>
				<NumberInput
					label="Scale X"
					value={data.scaleX}
					onChange={(val) => onChange('scaleX', typeof val === 'string' ? parseFloat(val) : val, data.scaleX)}
					decimalScale={2}
					min={0}
					step={0.01}
					size="xs"
				/>
				<NumberInput
					label="Scale Y"
					value={data.scaleY}
					onChange={(val) => onChange('scaleY', typeof val === 'string' ? parseFloat(val) : val, data.scaleY)}
					decimalScale={2}
					min={0}
					step={0.01}
					size="xs"
				/>
			</Group>
		</Stack>
	)
}
