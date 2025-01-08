import { NumberInput, Select, Stack, TextInput } from '@mantine/core'

const ALIGN_OPTIONS = [
	{ value: 0, label: 'Left' },
	{ value: 1, label: 'Middle' },
	{ value: 2, label: 'Right' },
] as const

type AlignType = (typeof ALIGN_OPTIONS)[number]['value']

export type BitmapTextProps = {
	content: string
	font: string
	fontSize: number
	align: AlignType
	maxWidth: number
	letterSpacing: number
	lineSpacing: number
}

interface BitmapTextSectionProps {
	properties: BitmapTextProps
	onChange: (properties: Partial<BitmapTextProps>) => void
}

export function BitmapTextSection({ properties, onChange }: BitmapTextSectionProps) {
	// pass list of available bitmap fonts from the project
	// it can be updated dynamically so the select should be updated accordingly
	return (
		<Stack gap="xs">
			<TextInput
				label="Content"
				value={properties.content}
				onChange={(e) => onChange({ content: e.currentTarget.value })}
				size="xs"
			/>

			{/* TODO: font should be a select based on list of available bitmap fonts from the project */}
			<TextInput
				label="Font"
				value={properties.font}
				onChange={(e) => onChange({ font: e.currentTarget.value })}
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

			<Select
				label="Text Align"
				value={properties.align.toString()}
				onChange={(value) => onChange({ align: Number(value) as AlignType })}
				data={ALIGN_OPTIONS.map((option) => ({ label: option.label, value: option.value.toString() }))}
				size="xs"
			/>

			<NumberInput
				label="Max Width"
				value={properties.maxWidth}
				onChange={(value) => onChange({ maxWidth: value as number })}
				min={0}
				step={10}
				size="xs"
			/>

			<NumberInput
				label="Letter Spacing"
				value={properties.letterSpacing}
				onChange={(value) => onChange({ letterSpacing: value as number })}
				step={1}
				size="xs"
			/>

			<NumberInput
				label="Line Spacing"
				value={properties.lineSpacing}
				onChange={(value) => onChange({ lineSpacing: value as number })}
				step={1}
				size="xs"
			/>
		</Stack>
	)
}
