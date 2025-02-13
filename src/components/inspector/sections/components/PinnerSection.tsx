import { PinnerComponentJson } from '@components/canvas/phaser/scenes/main/objects/components/PinnerComponent'
import { Group, Stack, TextInput } from '@mantine/core'
import { isNumericString } from '@sindresorhus/is'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'

interface PinnerSectionProps extends BaseSectionProps<PinnerComponentJson> {}

export function PinnerSection({ data }: PinnerSectionProps) {
	const snap = useSnapshot(data)

	return (
		<Stack gap="xs">
			<Group grow>
				<NumberInputCustom
					label="X"
					value={snap.x}
					onChange={(value) => (data.x = value)}
					min={0}
					max={1}
					step={0.1}
					decimalScale={1}
					size="xs"
				/>

				<NumberInputCustom
					label="Y"
					value={snap.y}
					onChange={(value) => (data.y = value)}
					min={0}
					max={1}
					step={0.1}
					decimalScale={1}
					size="xs"
				/>
			</Group>

			<Group grow>
				<TextInput
					label="X Offset"
					value={snap.xOffset}
					onChange={(event) => (data.xOffset = event.currentTarget.value)}
					size="xs"
					error={!validateOffset(snap.xOffset)}
				/>

				<TextInput
					label="Y Offset"
					value={snap.yOffset}
					onChange={(event) => (data.yOffset = event.currentTarget.value)}
					size="xs"
					error={!validateOffset(snap.yOffset)}
				/>
			</Group>
		</Stack>
	)
}

function validateOffset(offset: string): boolean {
	if (!offset) {
		return true
	}

	if (isNumericString(offset)) {
		return true
	}

	// if string like '10%', '-50%' or '+100%'
	const regex = /^-?\d*\.?\d*%?$/

	return regex.test(offset)
}
