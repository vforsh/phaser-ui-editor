import { EditableTextStyleJson } from '@components/canvas/phaser/scenes/main/objects/EditableText'
import { ColorInput, Group, Stack } from '@mantine/core'
import { useSnapshot } from 'valtio'

import { BaseSectionProps } from '../BaseSection'
import { CheckboxCustom } from '../common/CheckboxCustom'
import { NumberInputCustom } from '../common/NumberInputCustom'

interface TextShadowSectionProps extends BaseSectionProps<EditableTextStyleJson> {}

export function TextShadowSection({ data }: TextShadowSectionProps) {
	const snap = useSnapshot(data)

	return (
		<Stack gap="xs">
			<Group grow>
				<NumberInputCustom
					label="Offset X"
					value={snap.shadowOffsetX}
					onChange={(value) => (data.shadowOffsetX = value)}
					step={1}
					size="xs"
				/>
				<NumberInputCustom
					label="Offset Y"
					value={snap.shadowOffsetY}
					onChange={(value) => (data.shadowOffsetY = value)}
					step={1}
					size="xs"
				/>
			</Group>

			<ColorInput label="Color" value={snap.shadowColor} onChange={(value) => (data.shadowColor = value)} size="xs" format="hsla" />

			<NumberInputCustom
				label="Blur"
				value={snap.shadowBlur}
				onChange={(value) => (data.shadowBlur = value)}
				min={0}
				step={1}
				size="xs"
			/>

			<Group grow>
				<CheckboxCustom label="Apply to Fill" checked={snap.shadowFill} onChange={(value) => (data.shadowFill = value)} />
				<CheckboxCustom label="Apply to Stroke" checked={snap.shadowStroke} onChange={(value) => (data.shadowStroke = value)} />
			</Group>
		</Stack>
	)
}
