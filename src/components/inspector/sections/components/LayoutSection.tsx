import {
	HorizontalConstraint,
	LayoutComponentJson,
	LayoutScalar,
	LayoutUnit,
	VerticalConstraint,
} from '@components/canvas/phaser/scenes/main/objects/components/LayoutComponent'
import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { Group, SegmentedControl, Stack, Text, UnstyledButton } from '@mantine/core'
import { state } from '@state/State'
import { match } from 'ts-pattern'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'
import { findParentContainerId, ReadonlyContainerJson } from '../../utils/findParentContainerId'
import classes from './LayoutSection.module.css'

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
					data.horizontal = buildHorizontalConstraint(
						value as HorizontalConstraint['mode'],
						snap.horizontal,
						selectedObject,
						parent
					)
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
					data.vertical = buildVerticalConstraint(
						value as VerticalConstraint['mode'],
						snap.vertical,
						selectedObject,
						parent
					)
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

	return match(constraint.mode)
		.returnType<React.ReactNode>()
		.with('none', () => null)
		.with('start', () => (
			<ScalarInput
				label={labels.start}
				scalar={(constraint as Extract<typeof constraint, { mode: 'start' }>).start}
				onChange={(value) => updateScalarValue(data, axis, 'start', value)}
				onToggleUnit={() => toggleScalarUnit(data, axis, 'start', parentSize)}
			/>
		))
		.with('center', () => (
			<ScalarInput
				label={labels.center}
				scalar={(constraint as Extract<typeof constraint, { mode: 'center' }>).center}
				onChange={(value) => updateScalarValue(data, axis, 'center', value)}
				onToggleUnit={() => toggleScalarUnit(data, axis, 'center', parentSize)}
			/>
		))
		.with('end', () => (
			<ScalarInput
				label={labels.end}
				scalar={(constraint as Extract<typeof constraint, { mode: 'end' }>).end}
				onChange={(value) => updateScalarValue(data, axis, 'end', value)}
				onToggleUnit={() => toggleScalarUnit(data, axis, 'end', parentSize)}
			/>
		))
		.with('stretch', () => {
			const c = constraint as Extract<typeof constraint, { mode: 'stretch' }>
			return (
				<Group grow>
					<ScalarInput
						label={labels.start}
						scalar={c.start}
						onChange={(value) => updateScalarValue(data, axis, 'start', value)}
						onToggleUnit={() => toggleScalarUnit(data, axis, 'start', parentSize)}
					/>
					<ScalarInput
						label={labels.end}
						scalar={c.end}
						onChange={(value) => updateScalarValue(data, axis, 'end', value)}
						onToggleUnit={() => toggleScalarUnit(data, axis, 'end', parentSize)}
					/>
				</Group>
			)
		})
		.exhaustive()
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
			rightSection={<UnitToggleLabel unit={scalar.unit} onToggle={onToggleUnit} />}
			rightSectionWidth={40}
		/>
	)
}

function UnitToggleLabel({ unit, onToggle }: { unit: LayoutUnit; onToggle: () => void }) {
	return (
		<UnstyledButton
			onMouseDown={(event) => event.stopPropagation()}
			onClick={(event) => {
				event.stopPropagation()
				onToggle()
			}}
			style={{
				height: '100%',
				display: 'flex',
				alignItems: 'center',
				paddingRight: '8px',
			}}
		>
			<Text size="sm" fw={700} className={classes.unitToggle}>
				{unit === 'px' ? 'px' : '%'}
			</Text>
		</UnstyledButton>
	)
}

function buildHorizontalConstraint(
	mode: HorizontalConstraint['mode'],
	current: HorizontalConstraint,
	selectedObject: EditableObjectJson | undefined,
	parent: EditableContainerJson | undefined
): HorizontalConstraint {
	const parentWidth = parent?.width ?? 0
	const canCalculate = selectedObject && parent && parentWidth > 0
	const parentLeft = -parentWidth * (parent?.originX ?? 0)

	const getInitialScalar = (key: 'start' | 'center' | 'end'): LayoutScalar => {
		const existing = getScalar(current, key)
		if (existing !== DEFAULT_SCALAR) return cloneScalar(existing)
		if (!canCalculate) return cloneScalar(DEFAULT_SCALAR)

		const objLeftPx = selectedObject.x - selectedObject.displayWidth * (selectedObject.originX ?? 0)

		const valuePx = match(key)
			.returnType<number>()
			.with('start', () => objLeftPx - parentLeft)
			.with('center', () => objLeftPx - parentLeft + selectedObject.displayWidth / 2 - parentWidth / 2)
			.with('end', () => parentWidth - (objLeftPx - parentLeft) - selectedObject.displayWidth)
			.exhaustive()

		// match unit from another available scalar if possible
		const otherKey = key === 'start' ? 'end' : 'start'
		const otherScalar = getScalar(current, otherKey)
		const unit = otherScalar !== DEFAULT_SCALAR ? otherScalar.unit : 'px'

		return {
			value: unit === 'percent' ? valuePx / parentWidth : valuePx,
			unit,
		}
	}

	return match(mode)
		.returnType<HorizontalConstraint>()
		.with('none', () => ({ mode: 'none' }))
		.with('start', () => ({ mode: 'start', start: getInitialScalar('start') }))
		.with('center', () => ({ mode: 'center', center: getInitialScalar('center') }))
		.with('end', () => ({ mode: 'end', end: getInitialScalar('end') }))
		.with('stretch', () => ({
			mode: 'stretch',
			start: getInitialScalar('start'),
			end: getInitialScalar('end'),
		}))
		.exhaustive()
}

function buildVerticalConstraint(
	mode: VerticalConstraint['mode'],
	current: VerticalConstraint,
	selectedObject: EditableObjectJson | undefined,
	parent: EditableContainerJson | undefined
): VerticalConstraint {
	const parentHeight = parent?.height ?? 0
	const canCalculate = selectedObject && parent && parentHeight > 0
	const parentTop = -parentHeight * (parent?.originY ?? 0)

	const getInitialScalar = (key: 'start' | 'center' | 'end'): LayoutScalar => {
		const existing = getScalar(current, key)
		if (existing !== DEFAULT_SCALAR) return cloneScalar(existing)
		if (!canCalculate) return cloneScalar(DEFAULT_SCALAR)

		const objTopPx = selectedObject.y - selectedObject.displayHeight * (selectedObject.originY ?? 0)

		const valuePx = match(key)
			.returnType<number>()
			.with('start', () => objTopPx - parentTop)
			.with('center', () => objTopPx - parentTop + selectedObject.displayHeight / 2 - parentHeight / 2)
			.with('end', () => parentHeight - (objTopPx - parentTop) - selectedObject.displayHeight)
			.exhaustive()

		// match unit from another available scalar if possible
		const otherKey = key === 'start' ? 'end' : 'start'
		const otherScalar = getScalar(current, otherKey)
		const unit = otherScalar !== DEFAULT_SCALAR ? otherScalar.unit : 'px'

		return {
			value: unit === 'percent' ? valuePx / parentHeight : valuePx,
			unit,
		}
	}

	return match(mode)
		.returnType<VerticalConstraint>()
		.with('none', () => ({ mode: 'none' }))
		.with('start', () => ({ mode: 'start', start: getInitialScalar('start') }))
		.with('center', () => ({ mode: 'center', center: getInitialScalar('center') }))
		.with('end', () => ({ mode: 'end', end: getInitialScalar('end') }))
		.with('stretch', () => ({
			mode: 'stretch',
			start: getInitialScalar('start'),
			end: getInitialScalar('end'),
		}))
		.exhaustive()
}

function getScalar(
	constraint: HorizontalConstraint | VerticalConstraint,
	key: 'start' | 'center' | 'end'
): LayoutScalar {
	return match(constraint)
		.returnType<LayoutScalar>()
		.with({ mode: 'start' }, (c) => (key === 'start' ? c.start : DEFAULT_SCALAR))
		.with({ mode: 'center' }, (c) => (key === 'center' ? c.center : DEFAULT_SCALAR))
		.with({ mode: 'end' }, (c) => (key === 'end' ? c.end : DEFAULT_SCALAR))
		.with({ mode: 'stretch' }, (c) => {
			if (key === 'start') return c.start
			if (key === 'end') return c.end
			return DEFAULT_SCALAR
		})
		.with({ mode: 'none' }, () => DEFAULT_SCALAR)
		.exhaustive()
}

function getMutableScalar(
	constraint: HorizontalConstraint | VerticalConstraint,
	key: 'start' | 'center' | 'end'
): LayoutScalar | null {
	return match(constraint)
		.returnType<LayoutScalar | null>()
		.with({ mode: 'start' }, (c) => (key === 'start' ? c.start : null))
		.with({ mode: 'center' }, (c) => (key === 'center' ? c.center : null))
		.with({ mode: 'end' }, (c) => (key === 'end' ? c.end : null))
		.with({ mode: 'stretch' }, (c) => {
			if (key === 'start') return c.start
			if (key === 'end') return c.end
			return null
		})
		.with({ mode: 'none' }, () => null)
		.exhaustive()
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

function formatLayoutType(type: string): string {
	return match(type)
		.returnType<string>()
		.with('horizontal-layout', () => 'Horizontal Layout component')
		.with('vertical-layout', () => 'Vertical Layout component')
		.with('grid-layout', () => 'Grid Layout component')
		.otherwise(() => 'Layout component')
}
