import { Checkbox, ColorInput, NumberInput, Select, Stack } from '@mantine/core'
import { BaseSectionProps } from '../BaseSection'

export interface DisplayData {
	visible: boolean
	alpha: number
	blendMode: BlendMode
	tint?: string
	tintFill?: boolean
}

export type BlendMode = 'NORMAL' | 'ADD' | 'MULTIPLY' | 'SCREEN' | 'ERASE'

const BLEND_MODES: { label: string; value: BlendMode }[] = [
	{ label: 'Normal', value: 'NORMAL' },
	{ label: 'Add', value: 'ADD' },
	{ label: 'Multiply', value: 'MULTIPLY' },
	{ label: 'Screen', value: 'SCREEN' },
	{ label: 'Erase', value: 'ERASE' },
]

interface DisplaySectionProps extends BaseSectionProps<DisplayData> {}

export function DisplaySection({ data, onChange }: DisplaySectionProps) {
	return (
		<Stack gap="xs">
			<Checkbox
				label="Visible"
				checked={data.visible}
				onChange={(e) => onChange.visible(e.currentTarget.checked, data.visible)}
			/>

			<NumberInput
				label="Alpha"
				value={data.alpha}
				onChange={(value) => onChange.alpha(typeof value === 'string' ? parseFloat(value) : value, data.alpha)}
				min={0}
				max={1}
				step={0.01}
				size="xs"
			/>

			<Select
				label="Blend Mode"
				value={data.blendMode}
				onChange={(value) => onChange.blendMode(value as BlendMode, data.blendMode)}
				data={BLEND_MODES}
				size="xs"
			/>

			{(typeof data.tint === 'string') && (
				<ColorInput
					label="Tint"
					value={data.tint}
					onChange={(value) => onChange.tint(value, data.tint)}
					format="hexa"
					size="xs"
				/>
			)}

			{(typeof data.tintFill === 'boolean') && (
				<Checkbox
					label="Tint Fill"
					checked={data.tintFill}
					onChange={(e) => onChange.tintFill(e.currentTarget.checked, data.tintFill)}
					// size="xs"
				/>
			)}
		</Stack>
	)
}
