import { Checkbox, NumberInput, Select, Stack } from '@mantine/core'

export interface DisplayProperties {
	visible: boolean
	alpha: number
	blendMode: BlendMode
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
	props: DisplayProperties
	onChange: (properties: Partial<DisplayProperties>) => void
}

export function DisplaySection({ props, onChange }: DisplaySectionProps) {
	return (
		<Stack gap="xs">
			<Checkbox
				label="Visible"
				checked={props.visible}
				onChange={(e) => onChange({ visible: e.currentTarget.checked })}
			/>

			<NumberInput
				label="Alpha"
				value={props.alpha}
				onChange={(value) => onChange({ alpha: value as number })}
				min={0}
				max={100}
				step={1}
				size="xs"
			/>

			<Select
				label="Blend Mode"
				value={props.blendMode}
				onChange={(value) => onChange({ blendMode: value as BlendMode })}
				data={BLEND_MODES}
				size="xs"
			/>

      // TODO add tint
		</Stack>
	)
}
