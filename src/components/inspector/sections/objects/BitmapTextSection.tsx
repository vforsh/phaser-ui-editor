import { Group, NumberInput, Select, Stack, TextInput } from '@mantine/core'
import { state, State, useSnapshot } from '@state/State'
import { uniq } from 'es-toolkit'
import { getAssetsOfType } from '../../../../types/assets'

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
	data: BitmapTextProps
	onChange: (properties: Partial<BitmapTextProps>) => void
}

export function BitmapTextSection({ data, onChange }: BitmapTextSectionProps) {
	const snap = useSnapshot(state)

	const fonts = uniq(getAssetsOfType(snap.assets as State['assets'], 'bitmap-font').map((asset) => asset.name)).sort()

	return (
		<Stack gap="xs">
			<TextInput
				label="Content"
				value={data.content}
				onChange={(e) => onChange({ content: e.currentTarget.value })}
				size="xs"
			/>

			<Group grow>
				<Select
					label="Font"
					value={data.font}
					onChange={(value) => value && onChange({ font: value })}
					data={fonts.map((font) => ({ label: font, value: font }))}
					size="xs"
				/>

				<NumberInput
					label="Font Size"
					value={data.fontSize}
					onChange={(value) => onChange({ fontSize: value as number })}
					min={1}
					step={1}
					size="xs"
				/>
			</Group>

			<Select
				label="Text Align"
				value={data.align.toString()}
				onChange={(value) => onChange({ align: Number(value) as AlignType })}
				data={ALIGN_OPTIONS.map((option) => ({ label: option.label, value: option.value.toString() }))}
				size="xs"
			/>

			<NumberInput
				label="Max Width"
				value={data.maxWidth}
				onChange={(value) => onChange({ maxWidth: value as number })}
				min={0}
				step={10}
				size="xs"
			/>

			<NumberInput
				label="Letter Spacing"
				value={data.letterSpacing}
				onChange={(value) => onChange({ letterSpacing: value as number })}
				step={1}
				size="xs"
			/>

			<NumberInput
				label="Line Spacing"
				value={data.lineSpacing}
				onChange={(value) => onChange({ lineSpacing: value as number })}
				step={1}
				size="xs"
			/>
		</Stack>
	)
}
