import { EditableTextStyleJson } from '@components/canvas/phaser/scenes/main/objects/EditableText'
import { Checkbox, ColorInput, Group, Stack } from '@mantine/core'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'
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

			<ColorInput
				label="Color"
				value={snap.shadowColor}
				onChange={(value) => (data.shadowColor = value)}
				size="xs"
				format="hsla"
			/>

			<NumberInputCustom
				label="Blur"
				value={snap.shadowBlur}
				onChange={(value) => (data.shadowBlur = value)}
				min={0}
				step={1}
				size="xs"
			/>

			<Group grow>
				<Checkbox
					label="Apply to Fill"
					checked={snap.shadowFill}
					onChange={(e) => (data.shadowFill = e.currentTarget.checked)}
					size="xs"
				/>
				<Checkbox
					label="Apply to Stroke"
					checked={snap.shadowStroke}
					onChange={(e) => (data.shadowStroke = e.currentTarget.checked)}
					size="xs"
				/>
			</Group>
		</Stack>
	)
}
