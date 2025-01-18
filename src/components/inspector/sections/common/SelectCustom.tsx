import { Select, SelectProps } from '@mantine/core'
import { useEventListener } from '@mantine/hooks'
import classes from './SelectCustom.module.css'

interface SelectCustomProps<TOptions extends readonly string[]> extends Omit<SelectProps, 'onChange'> {
	onChange: (value: TOptions[number]) => void
	data: Array<{ label: string; value: TOptions[number] }>
	enableWheel?: boolean
}

/**
 * Select with custom styling to match NumberInputCustom
 */
export function SelectCustom<TOptions extends readonly string[]>(props: SelectCustomProps<TOptions>) {
	const { onChange, enableWheel, data, ...rest } = props

	const inputRef = useEventListener<'wheel', HTMLInputElement>(
		'wheel',
		(event: WheelEvent) => {
			if (!enableWheel) return
			event.preventDefault()
			if (!inputRef.current) return

			const currentValue = inputRef.current.value
			const currentIndex = data.findIndex((item) => item.value === currentValue)
			if (currentIndex === -1) return

			const delta = event.deltaY > 0 ? 1 : -1
			const newIndex = (currentIndex + delta + data.length) % data.length
			const newValue = data[newIndex].value

			onChange(newValue as TOptions[number])
		},
		{ passive: false }
	)

	return (
		<Select
			{...rest}
			data={data}
			onChange={(value) => value !== null && onChange(value as TOptions[number])}
			classNames={{
				input: classes.input,
				...rest.classNames,
			}}
			// @ts-expect-error
			ref={inputRef}
		/>
	)
}
