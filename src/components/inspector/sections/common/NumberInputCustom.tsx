import { NumberInput, NumberInputProps } from '@mantine/core'
import { useEventListener } from '@mantine/hooks'
import classes from './NumberInputCustom.module.css'

interface NumberInputCustomProps extends Omit<NumberInputProps, 'onChange'> {
	onChange: (value: number) => void
	step?: number
	shiftMultiplier?: number
	ctrlMultiplier?: number
}

/**
 * NumberInput with custom wheel event handling
 */
export function NumberInputCustom({
	onChange,
	step = 1,
	shiftMultiplier = 10,
	ctrlMultiplier = 0.1,
	...props
}: NumberInputCustomProps) {
	const inputRef = useEventListener<'wheel', HTMLInputElement>(
		'wheel',
		(event: WheelEvent) => {
			event.preventDefault()
			if (!inputRef.current) return

			const currentValue = parseFloat(inputRef.current.value) || 0
			let srcDelta = event.shiftKey ? event.deltaX : event.deltaY
			let delta = srcDelta > 0 ? -step : step

			// Modify step based on modifier keys
			if (event.shiftKey) {
				delta *= shiftMultiplier
			} else if (event.ctrlKey) {
				delta *= ctrlMultiplier
			}

			const newValue = currentValue + delta

			// Respect min/max constraints
			if (props.min !== undefined && newValue < props.min) return
			if (props.max !== undefined && newValue > props.max) return

			// Round to respect decimal scale
			const decimalScale = props.decimalScale ?? 0
			const roundedValue = Number(newValue.toFixed(decimalScale))

			onChange(roundedValue)
		},
		{ passive: false }
	)

	return (
		<NumberInput
			{...props}
			onChange={(value) => onChange(typeof value === 'string' ? parseFloat(value) : value)}
			// @ts-expect-error
			ref={inputRef}
			classNames={{
				input: classes.input,
			}}
		/>
	)
}
