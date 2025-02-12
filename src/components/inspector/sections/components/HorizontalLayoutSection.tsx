import { HorizontalLayoutComponentJson } from '@components/canvas/phaser/scenes/main/objects/components/EditableHorizontalLayoutComponent'
import { PHASER_ALIGN, PhaserAlignKey } from '@components/canvas/phaser/scenes/main/objects/PhaserAlign'
import { Group, Stack } from '@mantine/core'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'
import { SelectCustom } from '../common/SelectCustom'

interface HorizontalLayoutSectionProps extends BaseSectionProps<HorizontalLayoutComponentJson> {}

export function HorizontalLayoutSection({ data }: HorizontalLayoutSectionProps) {
	const snap = useSnapshot(data)

	return (
		<Stack gap="xs">
			<Group grow>
				<NumberInputCustom
					label="Cell Width"
					value={snap.cellWidth}
					onChange={(value) => (data.cellWidth = value)}
					min={0}
					step={1}
					size="xs"
				/>

				<NumberInputCustom
					label="Cell Height"
					value={snap.cellHeight}
					onChange={(value) => (data.cellHeight = value)}
					min={0}
					step={1}
					size="xs"
				/>
			</Group>

			<SelectCustom
				label="Align"
				value={snap.cellPosition}
				onChange={(value) => (data.cellPosition = value as PhaserAlignKey)}
				data={Object.entries(PHASER_ALIGN).map(([key, value]) => ({ label: key, value: key }))}
				size="xs"
			/>

			<NumberInputCustom
				label="Spacing X"
				value={snap.spacingX}
				onChange={(value) => (data.spacingX = value)}
				step={1}
				size="xs"
			/>
		</Stack>
	)
}
