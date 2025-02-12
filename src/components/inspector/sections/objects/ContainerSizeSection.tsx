import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { NumberInputCustom } from '@components/inspector/sections/common/NumberInputCustom'
import { Group, Stack } from '@mantine/core'
import { match } from 'ts-pattern'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'

interface ContainerSizeSectionProps extends BaseSectionProps<EditableObjectJson> {}

export function ContainerSizeSection({ data }: ContainerSizeSectionProps) {
	const snap = useSnapshot(data)

	const hasActiveSizeControllingComps = snap.components.some((comp) =>
		match(comp.type)
			.with('horizontal-layout', 'vertical-layout', 'grid-layout', () => comp.active)
			.otherwise(() => false)
	)

	return (
		<Stack gap="xs">
			<Group grow>
				<NumberInputCustom
					label="Width"
					value={snap.width}
					onChange={(val) => (data.width = val)}
					size="xs"
					// TODO add tooltip that explains that the width is controlled by the layout component
					readOnly={hasActiveSizeControllingComps}
				/>
				<NumberInputCustom
					label="Height"
					value={snap.height}
					onChange={(val) => (data.height = val)}
					size="xs"
					// TODO add tooltip that explains that the height is controlled by the layout component
					readOnly={hasActiveSizeControllingComps}
				/>
			</Group>

			{/* <Group grow>
				<NumberInputCustom
					label="Display Width"
					value={snap.displayWidth}
					onChange={(val) => (data.displayWidth = val)}
					min={0}
					size="xs"
					readOnly
				/>
				<NumberInputCustom
					label="Display Height"
					value={snap.displayHeight}
					onChange={(val) => (data.displayHeight = val)}
					min={0}
					size="xs"
					readOnly
				/>
			</Group> */}
		</Stack>
	)
}
