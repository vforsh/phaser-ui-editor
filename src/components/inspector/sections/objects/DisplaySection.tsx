import { Checkbox, ColorInput, NumberInput, Select, Stack } from '@mantine/core'

export interface DisplayData {
	visible: boolean
	alpha: number
	blendMode: BlendMode
	tint: string
	tintFill: boolean
}

export type BlendMode = 'NORMAL' | 'ADD' | 'MULTIPLY' | 'SCREEN' | 'ERASE'

const BLEND_MODES: { label: string; value: BlendMode }[] = [
	{ label: 'Normal', value: 'NORMAL' },
	{ label: 'Add', value: 'ADD' },
	{ label: 'Multiply', value: 'MULTIPLY' },
	{ label: 'Screen', value: 'SCREEN' },
	{ label: 'Erase', value: 'ERASE' },
]

interface DisplaySectionProps {
	data: DisplayData
	onChange: (properties: Partial<DisplayData>) => void
}

export function DisplaySection({ data, onChange }: DisplaySectionProps) {
	return (
		<Stack gap="xs">
			<Checkbox
				label="Visible"
				checked={data.visible}
				onChange={(e) => onChange({ visible: e.currentTarget.checked })}
			/>

			<NumberInput
				label="Alpha"
				value={data.alpha}
				onChange={(value) => onChange({ alpha: value as number })}
				min={0}
				max={1}
				step={0.01}
				size="xs"
			/>

			<Select
				label="Blend Mode"
				value={data.blendMode}
				onChange={(value) => onChange({ blendMode: value as BlendMode })}
				data={BLEND_MODES}
				size="xs"
			/>
			
			<ColorInput
				label="Tint"
				value={data.tint}
				onChange={(value) => onChange({ tint: value })}
				format="hexa"
				size="xs"
			/>

			<Checkbox
				label="Tint Fill"
				checked={data.tintFill}
				onChange={(e) => onChange({ tintFill: e.currentTarget.checked })}
				// size="xs"
			/>
		</Stack>
	)
}
