import { EditableTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableText'
import { Checkbox, ColorInput, Group, Select, Stack, TextInput } from '@mantine/core'
import { State, state, useSnapshot } from '@state/State'
import { uniq } from 'es-toolkit'
import { getAssetsOfType } from '../../../../types/assets'
import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'

const TEXT_ALIGN_TYPES = ['left', 'right', 'center', 'justify'] as const

export function isTextAlignType(value: string): value is TextAlignType {
	return TEXT_ALIGN_TYPES.includes(value as TextAlignType)
}

export type TextAlignType = (typeof TEXT_ALIGN_TYPES)[number]

/**
 * https://docs.phaser.io/api-documentation/class/gameobjects-textstyle
 */

interface TextSectionProps extends BaseSectionProps<EditableTextJson> {}

export function TextSection({ data }: TextSectionProps) {
	const assetsSnap = useSnapshot(state.assets)

	const fontFamilies = uniq(
		getAssetsOfType(assetsSnap as State['assets'], 'web-font').map((asset) => asset.fontFamily)
	).sort()

	const snap = useSnapshot(data)

	return (
		<Stack gap="xs">
			<TextInput
				label="Content"
				value={snap.text}
				onChange={(e) => (data.text = e.currentTarget.value)}
				size="xs"
			/>

			<NumberInputCustom
				label="Resolution"
				value={snap.style.resolution}
				onChange={(value) => (data.style.resolution = value)}
				min={1}
				max={3}
				step={0.25}
				size="xs"
			/>

			<Group grow>
				<Select
					label="Font Family"
					value={snap.style.fontFamily}
					onChange={(value) => value !== null && (data.style.fontFamily = value)}
					data={fontFamilies.map((font) => ({ label: font, value: font }))}
					size="xs"
				/>

				<NumberInputCustom
					label="Font Size"
					value={snap.style.fontSize}
					onChange={(value) => (data.style.fontSize = value + 'px')}
					min={1}
					step={1}
					size="xs"
				/>
			</Group>

			<ColorInput
				label="Font Color"
				value={snap.style.color}
				onChange={(value) => (data.style.color = value)}
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
				value={snap.style.align}
				onChange={(value) => value !== null && (data.style.align = value as TextAlignType)}
				data={TEXT_ALIGN_TYPES.map((type) => ({ label: type, value: type }))}
				size="xs"
			/>

			<Group grow>
				<NumberInputCustom
					label="Padding X"
					value={snap.paddingX}
					onChange={(value) => (data.paddingX = value)}
					min={0}
					step={1}
					size="xs"
				/>
				<NumberInputCustom
					label="Padding Y"
					value={snap.paddingY}
					onChange={(value) => (data.paddingY = value)}
					min={0}
					step={1}
					size="xs"
				/>
			</Group>

			<Group grow>
				<NumberInputCustom
					label="Letter Spacing"
					value={snap.letterSpacing}
					onChange={(value) => (data.letterSpacing = value)}
					// step={0.5}
					size="xs"
				/>

				<NumberInputCustom
					label="Line Spacing"
					value={snap.lineSpacing}
					onChange={(value) => (data.lineSpacing = value)}
					// step={0.1}
					size="xs"
				/>
			</Group>

			<NumberInputCustom
				label="Word Wrap Width"
				value={snap.wordWrapWidth}
				onChange={(value) => value !== null && (data.wordWrapWidth = value)}
				min={0}
				step={1}
				size="xs"
			/>

			<Checkbox
				label="Advanced Word Wrap"
				checked={snap.wordWrapUseAdvanced}
				onChange={(e) => (data.wordWrapUseAdvanced = e.currentTarget.checked)}
			/>
		</Stack>
	)
}
