import { Checkbox, ColorInput, NumberInput, Stack } from '@mantine/core'

export type TextStrokeProps =
	| {
			enabled: false
	  }
	| {
			enabled: true
			thickness: number
			color: string
	  }

interface TextStrokeSectionProps {
	properties: TextStrokeProps
	onChange: (properties: Partial<TextStrokeProps>) => void
}

export function TextStrokeSection({ properties, onChange }: TextStrokeSectionProps) {
	return (
		<Stack gap="xs">
			<Checkbox
				label="Enabled"
				checked={properties.enabled}
				onChange={(e) => onChange({ enabled: e.currentTarget.checked })}
				size="xs"
			/>

			{properties.enabled && (
				<>
					<NumberInput
						label="Thickness"
						value={properties.thickness}
						onChange={(value) => onChange({ thickness: value as number })}
						min={0}
						step={1}
						size="xs"
					/>

					<ColorInput
						label="Color"
						value={properties.color}
						onChange={(value) => onChange({ color: value })}
						size="xs"
					/>
				</>
			)}
		</Stack>
	)
}
