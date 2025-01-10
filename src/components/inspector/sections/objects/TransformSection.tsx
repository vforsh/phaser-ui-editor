import { Group, NumberInput, Stack } from '@mantine/core'

interface TransformData {
	x?: number
	y?: number
	originX: number
	originY: number
	angle?: number
	scale?: { x: number; y: number }
}

export function TransformSection({
	x = 0,
	y = 0,
	originX = 0,
	originY = 0,
	angle = 0,
	scale = { x: 1, y: 1 },
}: TransformData) {
	return (
		<Stack gap="xs">
			<Group grow>
				<NumberInput
					label="X"
					value={x}
					onChange={(val) => console.log('x changed:', val)}
					decimalScale={2}
					size="xs"
				/>
				<NumberInput
					label="Y"
					value={y}
					onChange={(val) => console.log('y changed:', val)}
					decimalScale={2}
					size="xs"
				/>
			</Group>
			<Group grow>
				<NumberInput
					label="Origin X"
					value={originX}
					onChange={(val) => console.log('originX changed:', val)}
					decimalScale={2}
					min={0}
					max={1}
					size="xs"
				/>
				<NumberInput
					label="Origin Y"
					value={originY}
					onChange={(val) => console.log('originY changed:', val)}
					decimalScale={2}
					min={0}
					max={1}
					size="xs"
				/>
			</Group>
			<NumberInput
				label="Angle"
				value={angle}
				onChange={(val) => console.log('angle changed:', val)}
				min={-180}
				max={180}
				step={1}
				size="xs"
			/>
			<Group grow>
				<NumberInput
					label="Scale X"
					value={scale.x}
					onChange={(val) => console.log('scale.x changed:', val)}
					decimalScale={2}
					min={0}
					step={0.01}
					size="xs"
				/>
				<NumberInput
					label="Scale Y"
					value={scale.y}
					onChange={(val) => console.log('scale.y changed:', val)}
					decimalScale={2}
					min={0}
					step={0.01}
					size="xs"
				/>
			</Group>
		</Stack>
	)
}
