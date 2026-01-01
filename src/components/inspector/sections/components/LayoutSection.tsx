import {
	HorizontalConstraint,
	LayoutComponentJson,
	LayoutScalar,
	LayoutUnit,
	VerticalConstraint,
} from '@components/canvas/phaser/scenes/main/objects/components/LayoutComponent'
import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { state } from '@state/State'
import { Box, Group, SegmentedControl, Stack, Text } from '@mantine/core'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'

interface LayoutSectionProps extends BaseSectionProps<LayoutComponentJson> {
	objectId: string
}

const DEFAULT_SCALAR: LayoutScalar = { value: 0, unit: 'px' }

export function LayoutSection({ data, objectId }: LayoutSectionProps) {
	const snap = useSnapshot(data)
	const canvasSnap = useSnapshot(state.canvas)
	const root = canvasSnap.root
	const parentId = findParentContainerId(root as ReadonlyContainerJson | null, objectId)
	const parent = parentId ? (canvasSnap.objectById(parentId) as EditableContainerJson | undefined) : undefined
	const parentWidth = parent?.width ?? 0
	const parentHeight = parent?.height ?? 0
	const selectedObject = canvasSnap.objectById(objectId)
	const isResizable = selectedObject?.type !== 'Text'

	const conflictType = parent?.components?.find((component) =>
		['horizontal-layout', 'vertical-layout', 'grid-layout'].includes(component.type)
	)?.type

	const hasStretch = snap.horizontal.mode === 'stretch' || snap.vertical.mode === 'stretch'

	return (
		<Stack gap="xs">
			<Text size="xs" fw={600}>
				Horizontal
			</Text>
			<SegmentedControl
				size="xs"
				value={snap.horizontal.mode}
				onChange={(value) => {
					data.horizontal = buildHorizontalConstraint(value as HorizontalConstraint['mode'], snap.horizontal)
				}}
				data={[
					{ label: 'None', value: 'none' },
					{ label: 'Left', value: 'start' },
					{ label: 'Center', value: 'center' },
					{ label: 'Right', value: 'end' },
					{ label: 'Stretch', value: 'stretch' },
				]}
			/>
			{renderAxisInputs({
				axis: 'horizontal',
				constraint: snap.horizontal,
				data,
				parentSize: parentWidth,
				labels: { start: 'Left', center: 'Center', end: 'Right' },
			})}

			<Text size="xs" fw={600} mt="xs">
				Vertical
			</Text>
			<SegmentedControl
				size="xs"
				value={snap.vertical.mode}
				onChange={(value) => {
					data.vertical = buildVerticalConstraint(value as VerticalConstraint['mode'], snap.vertical)
				}}
				data={[
					{ label: 'None', value: 'none' },
					{ label: 'Top', value: 'start' },
					{ label: 'Center', value: 'center' },
					{ label: 'Bottom', value: 'end' },
					{ label: 'Stretch', value: 'stretch' },
				]}
			/>
			{renderAxisInputs({
				axis: 'vertical',
				constraint: snap.vertical,
				data,
				parentSize: parentHeight,
				labels: { start: 'Top', center: 'Center', end: 'Bottom' },
			})}

			{conflictType && (
				<Text size="xs" c="orange">
					Layout is disabled because parent has {formatLayoutType(conflictType)}.
				</Text>
			)}

			{hasStretch && !isResizable && (
				<Text size="xs" c="orange">
					Stretch is selected, but this object is not resizable. Size will not change.
				</Text>
			)}

			{(parentWidth === 0 || parentHeight === 0) && (
				<Text size="xs" c="dimmed">
					Parent size is 0; percent conversions use the raw value.
				</Text>
			)}
		</Stack>
	)
}

function renderAxisInputs(args: {
	axis: 'horizontal' | 'vertical'
	constraint: HorizontalConstraint | VerticalConstraint
	data: LayoutComponentJson
	parentSize: number
	labels: { start: string; center: string; end: string }
}) {
	const { axis, constraint, data, parentSize, labels } = args

	switch (constraint.mode) {
		case 'none':
			return null
		case 'start':
			return (
				<ScalarInput
					label={labels.start}
					scalar={constraint.start}
					onChange={(value) => updateScalarValue(data, axis, 'start', value)}
					onToggleUnit={() => toggleScalarUnit(data, axis, 'start', parentSize)}
				/>
			)
		case 'center':
			return (
				<ScalarInput
					label={labels.center}
					scalar={constraint.center}
					onChange={(value) => updateScalarValue(data, axis, 'center', value)}
					onToggleUnit={() => toggleScalarUnit(data, axis, 'center', parentSize)}
				/>
			)
		case 'end':
			return (
				<ScalarInput
					label={labels.end}
					scalar={constraint.end}
					onChange={(value) => updateScalarValue(data, axis, 'end', value)}
					onToggleUnit={() => toggleScalarUnit(data, axis, 'end', parentSize)}
				/>
			)
		case 'stretch':
			return (
				<Group grow>
					<ScalarInput
						label={labels.start}
						scalar={constraint.start}
						onChange={(value) => updateScalarValue(data, axis, 'start', value)}
						onToggleUnit={() => toggleScalarUnit(data, axis, 'start', parentSize)}
					/>
					<ScalarInput
						label={labels.end}
						scalar={constraint.end}
						onChange={(value) => updateScalarValue(data, axis, 'end', value)}
						onToggleUnit={() => toggleScalarUnit(data, axis, 'end', parentSize)}
					/>
				</Group>
			)
	}
}

function ScalarInput({
	label,
	scalar,
	onChange,
	onToggleUnit,
}: {
	label: string
	scalar: LayoutScalar
	onChange: (value: number) => void
	onToggleUnit: () => void
}) {
	const isPercent = scalar.unit === 'percent'
	const displayValue = isPercent ? scalar.value * 100 : scalar.value

	const handleChange = (value: number) => {
		if (!Number.isFinite(value)) {
			return
		}

		const nextValue = isPercent ? value / 100 : value
		onChange(nextValue)
	}

	return (
		<NumberInputCustom
			label={label}
			value={displayValue}
			onChange={handleChange}
			step={1}
			decimalScale={isPercent ? 2 : 0}
			size="xs"
			rightSection={<UnitSegmentedControl unit={scalar.unit} onToggle={onToggleUnit} />}
			rightSectionWidth={96}
		/>
	)
}

function UnitSegmentedControl({ unit, onToggle }: { unit: LayoutUnit; onToggle: () => void }) {
	const data = [
		{ label: 'px', value: 'px' },
		{ label: '%', value: 'percent' },
	]

	return (
		<Box
			onMouseDown={(event) => event.stopPropagation()}
			onClick={(event) => event.stopPropagation()}
		>
			<SegmentedControl
				size="xs"
				value={unit}
				data={data}
				onChange={(value) => {
					if (value === unit) {
						return
					}
					onToggle()
				}}
			/>
		</Box>
	)
}

function buildHorizontalConstraint(
	mode: HorizontalConstraint['mode'],
	current: HorizontalConstraint
): HorizontalConstraint {
	switch (mode) {
		case 'none':
			return { mode: 'none' }
		case 'start':
			return { mode: 'start', start: cloneScalar(getScalar(current, 'start')) }
		case 'center':
			return { mode: 'center', center: cloneScalar(getScalar(current, 'center')) }
		case 'end':
			return { mode: 'end', end: cloneScalar(getScalar(current, 'end')) }
		case 'stretch':
			return {
				mode: 'stretch',
				start: cloneScalar(getScalar(current, 'start')),
				end: cloneScalar(getScalar(current, 'end')),
			}
	}
}

function buildVerticalConstraint(mode: VerticalConstraint['mode'], current: VerticalConstraint): VerticalConstraint {
	switch (mode) {
		case 'none':
			return { mode: 'none' }
		case 'start':
			return { mode: 'start', start: cloneScalar(getScalar(current, 'start')) }
		case 'center':
			return { mode: 'center', center: cloneScalar(getScalar(current, 'center')) }
		case 'end':
			return { mode: 'end', end: cloneScalar(getScalar(current, 'end')) }
		case 'stretch':
			return {
				mode: 'stretch',
				start: cloneScalar(getScalar(current, 'start')),
				end: cloneScalar(getScalar(current, 'end')),
			}
	}
}

function getScalar(
	constraint: HorizontalConstraint | VerticalConstraint,
	key: 'start' | 'center' | 'end'
): LayoutScalar {
	switch (constraint.mode) {
		case 'start':
			return key === 'start' ? constraint.start : DEFAULT_SCALAR
		case 'center':
			return key === 'center' ? constraint.center : DEFAULT_SCALAR
		case 'end':
			return key === 'end' ? constraint.end : DEFAULT_SCALAR
		case 'stretch':
			if (key === 'start') return constraint.start
			if (key === 'end') return constraint.end
			return DEFAULT_SCALAR
		case 'none':
			return DEFAULT_SCALAR
	}
}

function getMutableScalar(
	constraint: HorizontalConstraint | VerticalConstraint,
	key: 'start' | 'center' | 'end'
): LayoutScalar | null {
	switch (constraint.mode) {
		case 'start':
			return key === 'start' ? constraint.start : null
		case 'center':
			return key === 'center' ? constraint.center : null
		case 'end':
			return key === 'end' ? constraint.end : null
		case 'stretch':
			if (key === 'start') return constraint.start
			if (key === 'end') return constraint.end
			return null
		case 'none':
			return null
	}
}

function cloneScalar(scalar: LayoutScalar): LayoutScalar {
	return { value: scalar.value, unit: scalar.unit }
}

function updateScalarValue(
	data: LayoutComponentJson,
	axis: 'horizontal' | 'vertical',
	key: 'start' | 'center' | 'end',
	value: number
) {
	const target = axis === 'horizontal' ? data.horizontal : data.vertical
	const scalar = getMutableScalar(target, key)
	if (!scalar) {
		return
	}
	scalar.value = value
}

function toggleScalarUnit(
	data: LayoutComponentJson,
	axis: 'horizontal' | 'vertical',
	key: 'start' | 'center' | 'end',
	parentSize: number
) {
	const target = axis === 'horizontal' ? data.horizontal : data.vertical
	const scalar = getMutableScalar(target, key)
	if (!scalar) {
		return
	}

	const nextUnit: LayoutUnit = scalar.unit === 'px' ? 'percent' : 'px'
	let nextValue = scalar.value
	if (parentSize > 0) {
		nextValue = scalar.unit === 'px' ? scalar.value / parentSize : scalar.value * parentSize
	}

	scalar.unit = nextUnit
	scalar.value = nextValue
}

type ReadonlyContainerJson = Omit<EditableContainerJson, 'children'> & { children: readonly EditableObjectJson[] }

function findParentContainerId(root: ReadonlyContainerJson | null, objId: string): string | null {
	if (!root) {
		return null
	}

	for (const child of root.children) {
		if (child.id === objId) {
			return root.id
		}
		if (child.type === 'Container') {
			const found = findParentContainerId(child, objId)
			if (found) {
				return found
			}
		}
	}

	return null
}

function formatLayoutType(type: string): string {
	switch (type) {
		case 'horizontal-layout':
			return 'Horizontal Layout component'
		case 'vertical-layout':
			return 'Vertical Layout component'
		case 'grid-layout':
			return 'Grid Layout component'
		default:
			return 'Layout component'
	}
}
