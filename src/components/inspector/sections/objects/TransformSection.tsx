import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { NumberInputCustom } from '@components/inspector/sections/common/NumberInputCustom'
import { Group, Stack } from '@mantine/core'
import { state } from '@state/State'
import { useSnapshot } from 'valtio'

export interface TransformSectionData {
	x: number
	y: number
	originX: number
	originY: number
	angle: number
	scaleX: number
	scaleY: number
}

interface TransformSectionProps {
	data: EditableObjectJson
}

// TODO pass snap as prop
export function TransformSection({ data }: TransformSectionProps) {
	const stateObj = state.canvas.objectById!(data.id)!
	const snap = useSnapshot(stateObj)

	return (
		<Stack gap="xs">
			<Group grow>
				<NumberInputCustom
					label="X"
					value={snap.x}
					onChange={(val) => {
						const obj = state.canvas.objectById!(data.id)
						if (obj) {
							obj.x = val
						}
					}}
					decimalScale={2}
					size="xs"
				/>
				<NumberInputCustom
					label="Y"
					value={snap.y}
					onChange={(val) => {
						const obj = state.canvas.objectById!(data.id)
						if (obj) {
							obj.y = val
						}
					}}
					decimalScale={2}
					size="xs"
				/>
			</Group>
			<Group grow>
				<NumberInputCustom
					label="Origin X"
					value={snap['origin.x']}
					onChange={(val) => {
						const obj = state.canvas.objectById!(data.id)
						if (obj) {
							obj['origin.x'] = val
						}
					}}
					decimalScale={2}
					min={0}
					max={1}
					step={0.01}
					size="xs"
				/>
				<NumberInputCustom
					label="Origin Y"
					value={snap['origin.y']}
					onChange={(val) => {
						const obj = state.canvas.objectById!(data.id)
						if (obj) {
							obj['origin.y'] = val
						}
					}}
					decimalScale={2}
					min={0}
					max={1}
					step={0.01}
					size="xs"
				/>
			</Group>
			<NumberInputCustom
				label="Angle"
				value={snap.angle}
				onChange={(val) => {
					const obj = state.canvas.objectById!(data.id)
					if (obj) {
						obj.angle = val
					}
				}}
				decimalScale={0}
				min={-180}
				max={180}
				step={1}
				size="xs"
			/>
			<Group grow>
				<NumberInputCustom
					label="Scale X"
					value={snap.scale.x}
					onChange={(val) => {
						const obj = state.canvas.objectById!(data.id)
						if (obj) {
							obj.scale.x = val
						}
					}}
					decimalScale={2}
					min={0}
					step={0.01}
					size="xs"
				/>
				<NumberInputCustom
					label="Scale Y"
					value={snap.scale.y}
					onChange={(val) => {
						const obj = state.canvas.objectById!(data.id)
						if (obj) {
							obj.scale.y = val
						}
					}}
					decimalScale={2}
					min={0}
					step={0.01}
					size="xs"
				/>
			</Group>
		</Stack>
	)
}
