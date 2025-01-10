import { Checkbox, ColorInput, Group, NumberInput, Select, Stack, TextInput } from '@mantine/core'
import { State, state, useSnapshot } from '@state/State'
import { uniq } from 'es-toolkit'
import { getAssetsOfType } from '../../../../types/assets'

const TEXT_ALIGN_TYPES = ['left', 'right', 'center', 'justify'] as const

export function isTextAlignType(value: string): value is TextAlignType {
	return TEXT_ALIGN_TYPES.includes(value as TextAlignType)
}

export type TextAlignType = (typeof TEXT_ALIGN_TYPES)[number]

/**
 * https://docs.phaser.io/api-documentation/class/gameobjects-textstyle
 */
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
}

interface TextSectionProps {
	properties: TextProps
	onChange: (properties: Partial<TextProps>) => void
}

export function TextSection({ properties, onChange }: TextSectionProps) {
	const snap = useSnapshot(state)

	const fontFamilies = uniq(
		getAssetsOfType(snap.assets as State['assets'], 'web-font').map((asset) => asset.fontFamily)
	).sort()

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
				max={3}
				step={0.5}
				size="xs"
			/>

			<Group grow>
				<Select
					label="Font Family"
					value={properties.fontFamily}
					onChange={(value) => value && onChange({ fontFamily: value })}
					data={fontFamilies.map((font) => ({ label: font, value: font }))}
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
			</Group>

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

			<Group grow>
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
			</Group>

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
