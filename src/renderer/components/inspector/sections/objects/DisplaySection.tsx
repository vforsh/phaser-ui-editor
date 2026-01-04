import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ColorInput, Stack } from '@mantine/core'
import { Snapshot, useSnapshot } from 'valtio'

import { BaseSectionProps } from '../BaseSection'
import { CheckboxCustom } from '../common/CheckboxCustom'
import { NumberInputCustom } from '../common/NumberInputCustom'

export type BlendMode = 'NORMAL' | 'ADD' | 'MULTIPLY' | 'SCREEN' | 'ERASE'

const BLEND_MODES: { label: string; value: BlendMode }[] = [
	{ label: 'Normal', value: 'NORMAL' },
	{ label: 'Add', value: 'ADD' },
	{ label: 'Multiply', value: 'MULTIPLY' },
	{ label: 'Screen', value: 'SCREEN' },
	{ label: 'Erase', value: 'ERASE' },
]

interface DisplaySectionProps extends BaseSectionProps<EditableObjectJson> {}

export function DisplaySection({ data }: DisplaySectionProps) {
	const snap = useSnapshot(data)

	const hasTint = (obj: EditableObjectJson | Snapshot<EditableObjectJson>): obj is EditableObjectJson & { tint: number } => {
		return 'tint' in obj && typeof obj.tint === 'number'
	}

	const hasTintFill = (obj: EditableObjectJson | Snapshot<EditableObjectJson>): obj is EditableObjectJson & { tintFill: boolean } => {
		return 'tintFill' in obj && typeof obj.tintFill === 'boolean'
	}

	return (
		<Stack gap="xs">
			<CheckboxCustom label="Visible" checked={snap.visible} onChange={(checked) => (data.visible = checked)} />

			<NumberInputCustom
				label="Alpha"
				value={snap.alpha}
				onChange={(value) => (data.alpha = value)}
				min={0}
				max={1}
				decimalScale={2}
				step={0.01}
				size="xs"
			/>

			{/* <Select
				label="Blend Mode"
				value={snap.blendMode}
				onChange={(value) => (data.blendMode = value as BlendMode)}
				data={BLEND_MODES}
				size="xs"
			/> */}

			{hasTint(data) && hasTint(snap) && (
				<ColorInput
					label="Tint"
					value={'#' + snap.tint.toString(16)}
					onChange={(value) => (data.tint = parseInt(value.slice(1), 16))}
					format="hex"
					size="xs"
				/>
			)}

			{hasTintFill(data) && hasTintFill(snap) && (
				<CheckboxCustom label="Tint Fill" checked={snap.tintFill} onChange={(checked) => (data.tintFill = checked)} />
			)}
		</Stack>
	)
}
