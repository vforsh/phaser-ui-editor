import type { GraphicsStrokeJson } from '@tekton/runtime'

import { ColorInput, Stack } from '@mantine/core'
import { useSnapshot } from 'valtio'

import { BaseSectionProps } from '../BaseSection'
import { CheckboxCustom } from '../common/CheckboxCustom'
import { NumberInputCustom } from '../common/NumberInputCustom'
import { SelectCustom } from '../common/SelectCustom'

const LINE_JOINS = ['miter', 'bevel', 'round'] as const
const LINE_CAPS = ['butt', 'square', 'round'] as const

const LINE_JOIN_OPTIONS = [
	{ label: 'Miter', value: 'miter' },
	{ label: 'Bevel', value: 'bevel' },
	{ label: 'Round', value: 'round' },
] satisfies Array<{ label: string; value: (typeof LINE_JOINS)[number] }>

const LINE_CAP_OPTIONS = [
	{ label: 'Butt', value: 'butt' },
	{ label: 'Square', value: 'square' },
	{ label: 'Round', value: 'round' },
] satisfies Array<{ label: string; value: (typeof LINE_CAPS)[number] }>

interface GraphicsStrokeSectionProps extends BaseSectionProps<GraphicsStrokeJson> {}

export function GraphicsStrokeSection({ data }: GraphicsStrokeSectionProps) {
	const snap = useSnapshot(data)
	const colorHex = `#${snap.color.toString(16).padStart(6, '0')}`

	return (
		<Stack gap="xs">
			<CheckboxCustom label="Enabled" checked={snap.enabled} onChange={(checked) => (data.enabled = checked)} />

			<NumberInputCustom
				label="Width"
				value={snap.width}
				onChange={(value) => (data.width = value)}
				min={0}
				step={1}
				size="xs"
				disabled={!snap.enabled}
			/>

			<ColorInput
				label="Color"
				value={colorHex}
				onChange={(value) => (data.color = parseInt(value.slice(1), 16))}
				format="hex"
				size="xs"
				disabled={!snap.enabled}
			/>

			<NumberInputCustom
				label="Alpha"
				value={snap.alpha}
				onChange={(value) => (data.alpha = value)}
				min={0}
				max={1}
				step={0.01}
				decimalScale={2}
				size="xs"
				disabled={!snap.enabled}
			/>

			<SelectCustom<typeof LINE_JOINS>
				label="Line Join"
				value={snap.lineJoin}
				data={LINE_JOIN_OPTIONS}
				onChange={(value) => (data.lineJoin = value)}
				size="xs"
				disabled={!snap.enabled}
			/>

			<SelectCustom<typeof LINE_CAPS>
				label="Line Cap"
				value={snap.lineCap}
				data={LINE_CAP_OPTIONS}
				onChange={(value) => (data.lineCap = value)}
				size="xs"
				disabled={!snap.enabled}
			/>

			<NumberInputCustom
				label="Miter Limit"
				value={snap.miterLimit}
				onChange={(value) => (data.miterLimit = value)}
				min={0}
				step={1}
				size="xs"
				disabled={!snap.enabled}
			/>
		</Stack>
	)
}
