import { Checkbox, ColorInput, Group, NumberInput, Stack } from '@mantine/core'

export type TextShadowProps = Phaser.Types.GameObjects.Text.TextShadow & {
	enabled: boolean
}

interface TextShadowSectionProps {
	properties: TextShadowProps
	onChange: (properties: Partial<TextShadowProps>) => void
}

export function TextShadowSection({ properties, onChange }: TextShadowSectionProps) {
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
					<Group grow>
						<NumberInput
							label="Offset X"
							value={properties.offsetX}
							onChange={(value) => onChange({ offsetX: value as number })}
							step={1}
							size="xs"
						/>
						<NumberInput
							label="Offset Y"
							value={properties.offsetY}
							onChange={(value) => onChange({ offsetY: value as number })}
							step={1}
							size="xs"
						/>
					</Group>

					{/* TODO: check if ColorInput does support alpha (color in 'rgba(...)' format) */}
					<ColorInput
						label="Color"
						value={properties.color}
						onChange={(value) => onChange({ color: value })}
						size="xs"
					/>

					<NumberInput
						label="Blur"
						value={properties.blur}
						onChange={(value) => onChange({ blur: value as number })}
						min={0}
						step={1}
						size="xs"
					/>

					<Group grow>
						<Checkbox
							label="Apply to Fill"
							checked={properties.fill}
							onChange={(e) => onChange({ fill: e.currentTarget.checked })}
							size="xs"
						/>
						<Checkbox
							label="Apply to Stroke"
							checked={properties.stroke}
							onChange={(e) => onChange({ stroke: e.currentTarget.checked })}
							size="xs"
						/>
					</Group>
				</>
			)}
		</Stack>
	)
}
