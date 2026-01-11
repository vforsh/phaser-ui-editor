import type { EditableGraphicsJson } from '@tekton/runtime'

import { Group, Stack } from '@mantine/core'
import { useSnapshot } from 'valtio'

import { BaseSectionProps } from '../BaseSection'
import { CheckboxCustom } from '../common/CheckboxCustom'
import { NumberInputCustom } from '../common/NumberInputCustom'
import { SelectCustom } from '../common/SelectCustom'

const SHAPE_TYPES = ['rectangle', 'ellipse'] as const

const SHAPE_OPTIONS = [
	{ label: 'Rectangle', value: 'rectangle' },
	{ label: 'Ellipse', value: 'ellipse' },
] satisfies Array<{ label: string; value: (typeof SHAPE_TYPES)[number] }>

interface GraphicsShapeSectionProps extends BaseSectionProps<EditableGraphicsJson> {}

const DEFAULT_CORNER_RADIUS = {
	mode: 'simple' as const,
	simple: 0,
	advanced: { tl: 0, tr: 0, br: 0, bl: 0 },
}

const cloneCornerRadius = () => ({
	mode: DEFAULT_CORNER_RADIUS.mode,
	simple: DEFAULT_CORNER_RADIUS.simple,
	advanced: { ...DEFAULT_CORNER_RADIUS.advanced },
})

export function GraphicsShapeSection({ data }: GraphicsShapeSectionProps) {
	const snap = useSnapshot(data)

	const handleShapeChange = (value: (typeof SHAPE_TYPES)[number]) => {
		if (value === 'rectangle') {
			const cornerRadius = data.shape.type === 'rectangle' ? data.shape.cornerRadius : cloneCornerRadius()
			data.shape = { type: 'rectangle', cornerRadius }
			return
		}

		data.shape = { type: 'ellipse' }
	}

	const rectangleShape = data.shape.type === 'rectangle' ? data.shape : null
	const cornerRadius = snap.shape.type === 'rectangle' ? snap.shape.cornerRadius : DEFAULT_CORNER_RADIUS

	return (
		<Stack gap="xs">
			<SelectCustom<typeof SHAPE_TYPES>
				label="Shape"
				data={SHAPE_OPTIONS}
				value={snap.shape.type}
				onChange={handleShapeChange}
				size="xs"
			/>

			<Group grow>
				<NumberInputCustom label="Width" value={snap.width} onChange={(value) => (data.width = value)} size="xs" decimalScale={2} />
				<NumberInputCustom
					label="Height"
					value={snap.height}
					onChange={(value) => (data.height = value)}
					size="xs"
					decimalScale={2}
				/>
			</Group>

			{rectangleShape && (
				<>
					<CheckboxCustom
						label="Advanced corners"
						checked={cornerRadius.mode === 'advanced'}
						onChange={(checked) => (rectangleShape.cornerRadius.mode = checked ? 'advanced' : 'simple')}
					/>

					{cornerRadius.mode === 'simple' ? (
						<NumberInputCustom
							label="Radius"
							value={cornerRadius.simple}
							onChange={(value) => (rectangleShape.cornerRadius.simple = value)}
							size="xs"
							min={0}
						/>
					) : (
						<>
							<Group grow>
								<NumberInputCustom
									label="Top Left"
									value={cornerRadius.advanced.tl}
									onChange={(value) => (rectangleShape.cornerRadius.advanced.tl = value)}
									size="xs"
									min={0}
								/>
								<NumberInputCustom
									label="Top Right"
									value={cornerRadius.advanced.tr}
									onChange={(value) => (rectangleShape.cornerRadius.advanced.tr = value)}
									size="xs"
									min={0}
								/>
							</Group>
							<Group grow>
								<NumberInputCustom
									label="Bottom Left"
									value={cornerRadius.advanced.bl}
									onChange={(value) => (rectangleShape.cornerRadius.advanced.bl = value)}
									size="xs"
									min={0}
								/>
								<NumberInputCustom
									label="Bottom Right"
									value={cornerRadius.advanced.br}
									onChange={(value) => (rectangleShape.cornerRadius.advanced.br = value)}
									size="xs"
									min={0}
								/>
							</Group>
						</>
					)}
				</>
			)}
		</Stack>
	)
}
