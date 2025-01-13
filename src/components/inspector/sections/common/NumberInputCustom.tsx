import { NumberInput, NumberInputProps } from '@mantine/core'
import { useEffect, useRef, WheelEvent } from 'react'
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
	const inputRef = useRef<HTMLInputElement>(null)

	const handleWheel = (event: WheelEvent<HTMLInputElement> | WheelEvent) => {
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
	}

	useEffect(() => {
		const input = inputRef.current
		if (!input) return

		// Add wheel event listener with { passive: false }
		input.addEventListener('wheel', handleWheel as any, { passive: false })

		// Cleanup
		return () => {
			input.removeEventListener('wheel', handleWheel as any)
		}
	}, [step, shiftMultiplier, ctrlMultiplier, props.min, props.max, props.decimalScale])

	return (
		<NumberInput
			{...props}
			onChange={(value) => onChange(typeof value === 'string' ? parseFloat(value) : value)}
			ref={inputRef}
			classNames={{
				input: classes.input,
			}}
		/>
	)
}
