import { GraphicsFillJson } from '@components/canvas/phaser/scenes/main/objects/EditableGraphics'
import { ColorInput, Stack } from '@mantine/core'
import { useSnapshot } from 'valtio'

import { BaseSectionProps } from '../BaseSection'
import { CheckboxCustom } from '../common/CheckboxCustom'
import { NumberInputCustom } from '../common/NumberInputCustom'

interface GraphicsFillSectionProps extends BaseSectionProps<GraphicsFillJson> {}

export function GraphicsFillSection({ data }: GraphicsFillSectionProps) {
	const snap = useSnapshot(data)
	const colorHex = `#${snap.color.toString(16).padStart(6, '0')}`

	return (
		<Stack gap="xs">
			<CheckboxCustom label="Enabled" checked={snap.enabled} onChange={(checked) => (data.enabled = checked)} />

			<ColorInput
				label="Color"
				value={colorHex}
				onChange={(value) => (data.color = parseInt(value.slice(1), 16))}
				format="hex"
				size="xs"
				disabled={!snap.enabled}
			/>

			<NumberInputCustom
				label="Alpha"
				value={snap.alpha}
				onChange={(value) => (data.alpha = value)}
				min={0}
				max={1}
				step={0.01}
				decimalScale={2}
				size="xs"
				disabled={!snap.enabled}
			/>
		</Stack>
	)
}
