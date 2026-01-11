import type { EditableTextStyleJson } from '@tekton/runtime'

import { ColorInput, Stack } from '@mantine/core'
import { useSnapshot } from 'valtio'

import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'

interface TextStrokeSectionProps extends BaseSectionProps<EditableTextStyleJson> {}

export function TextStrokeSection({ data }: TextStrokeSectionProps) {
	const snap = useSnapshot(data)

	return (
		<Stack gap="xs">
			<NumberInputCustom
				label="Thickness"
				value={snap.strokeThickness}
				onChange={(value) => (data.strokeThickness = value)}
				min={0}
				step={1}
				size="xs"
			/>

			<ColorInput label="Color" value={snap.stroke} onChange={(value) => (data.stroke = value)} size="xs" format="hsla" />
		</Stack>
	)
}
