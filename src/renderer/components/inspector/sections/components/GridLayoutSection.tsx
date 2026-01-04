import { GridLayoutComponentJson } from '@components/canvas/phaser/scenes/main/objects/components/GridLayoutComponent'
import { Group, Space, Stack, Switch } from '@mantine/core'
import { useSnapshot } from 'valtio'

import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'

interface GridLayoutSectionProps extends BaseSectionProps<GridLayoutComponentJson> {}

export function GridLayoutSection({ data }: GridLayoutSectionProps) {
	const snap = useSnapshot(data)

	return (
		<Stack gap="xs">
			<NumberInputCustom
				label="Columns"
				value={snap.columns}
				onChange={(value) => (data.columns = value)}
				min={1}
				step={1}
				size="xs"
			/>

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

			{/* always align to center for now */}
			{/* <SelectCustom
				label="Align"
				value={snap.cellPosition}
				onChange={(value) => (data.cellPosition = value as PhaserAlignKey)}
				data={Object.entries(PHASER_ALIGN).map(([key, value]) => ({ label: key, value: key }))}
				size="xs"
			/> */}

			<Group grow>
				<NumberInputCustom
					label="Spacing X"
					value={snap.spacingX}
					onChange={(value) => (data.spacingX = value)}
					step={1}
					size="xs"
				/>

				<NumberInputCustom
					label="Spacing Y"
					value={snap.spacingY}
					onChange={(value) => (data.spacingY = value)}
					step={1}
					size="xs"
				/>
			</Group>

			<Space h="2px" />

			<Switch
				label="Center Last Row"
				checked={snap.centerLastRow}
				onChange={(value) => (data.centerLastRow = value.target.checked)}
			/>
		</Stack>
	)
}
