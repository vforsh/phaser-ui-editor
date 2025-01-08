import { Checkbox, ColorInput, Group, NumberInput, Select, Stack, TextInput } from '@mantine/core'

const TEXT_ALIGN_TYPES = ['left', 'right', 'center', 'justify'] as const

export function isTextAlignType(value: string): value is TextAlignType {
	return TEXT_ALIGN_TYPES.includes(value as TextAlignType)
}

export type TextAlignType = (typeof TEXT_ALIGN_TYPES)[number]

export interface TextProps {
	content: string
	resolution: number
	fontFamily: string
	fontSize: number
	fontColor: string
	align: TextAlignType
	padding: { x: number; y: number }
	letterSpacing: number
	lineSpacing: number
	wordWrapWidth: number
	wordWrapAdvanced: boolean

	// move text stroke to separate section
	// stroke: { color: string; width: number }
}

interface TextSectionProps {
	properties: TextProps
	onChange: (properties: Partial<TextProps>) => void
}

export function TextSection({ properties, onChange }: TextSectionProps) {
	return (
		<Stack gap="xs">
			<TextInput
				label="Content"
				value={properties.content}
				onChange={(e) => onChange({ content: e.currentTarget.value })}
				size="xs"
			/>

			<NumberInput
				label="Resolution"
				value={properties.resolution}
				onChange={(value) => onChange({ resolution: value as number })}
				min={1}
				step={1}
				size="xs"
			/>

			{/* TODO font family should be a select based on list of available fonts from the project */}
			<TextInput
				label="Font Family"
				value={properties.fontFamily}
				onChange={(e) => onChange({ fontFamily: e.currentTarget.value })}
				size="xs"
			/>

			<NumberInput
				label="Font Size"
				value={properties.fontSize}
				onChange={(value) => onChange({ fontSize: value as number })}
				min={1}
				step={1}
				size="xs"
			/>

			<ColorInput
				label="Font Color"
				value={properties.fontColor}
				onChange={(value) => onChange({ fontColor: value })}
				size="xs"
			/>

			{/* <NumberInput
				label="Font Weight"
				value={properties.fontWeight}
				onChange={(value) => onChange({ fontWeight: value as number })}
				min={100}
				max={900}
				step={100}
				size="xs"
			/> */}

			<Select
				label="Text Align"
				value={properties.align}
				onChange={(value) => onChange({ align: value as TextAlignType })}
				data={TEXT_ALIGN_TYPES.map((type) => ({ label: type, value: type }))}
				size="xs"
			/>

			<Group grow>
				<NumberInput
					label="Padding X"
					value={properties.padding.x}
					onChange={(value) => onChange({ padding: { ...properties.padding, x: value as number } })}
					min={0}
					step={1}
					size="xs"
				/>
				<NumberInput
					label="Padding Y"
					value={properties.padding.y}
					onChange={(value) => onChange({ padding: { ...properties.padding, y: value as number } })}
					min={0}
					step={1}
					size="xs"
				/>
			</Group>

			<NumberInput
				label="Letter Spacing"
				value={properties.letterSpacing}
				onChange={(value) => onChange({ letterSpacing: value as number })}
				step={0.1}
				size="xs"
			/>

			<NumberInput
				label="Line Spacing"
				value={properties.lineSpacing}
				onChange={(value) => onChange({ lineSpacing: value as number })}
				step={0.1}
				size="xs"
			/>

			<NumberInput
				label="Word Wrap Width"
				value={properties.wordWrapWidth}
				onChange={(value) => onChange({ wordWrapWidth: value as number })}
				min={0}
				step={1}
				size="xs"
			/>

			<Checkbox
				label="Advanced Word Wrap"
				checked={properties.wordWrapAdvanced}
				onChange={(e) => onChange({ wordWrapAdvanced: e.currentTarget.checked })}
			/>
		</Stack>
	)
}
