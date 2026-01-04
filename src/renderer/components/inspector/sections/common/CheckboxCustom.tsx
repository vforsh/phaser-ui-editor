import { Checkbox, CheckboxProps } from '@mantine/core'

import classes from './CheckboxCustom.module.css'

interface CheckboxCustomProps extends Omit<CheckboxProps, 'onChange'> {
	onChange: (checked: boolean) => void
}

/**
 * Checkbox with custom styling to match other custom form components
 */
export function CheckboxCustom(props: CheckboxCustomProps) {
	const { onChange, ...rest } = props

	return (
		<Checkbox
			{...rest}
			onChange={(event) => onChange(event.currentTarget.checked)}
			classNames={{
				input: classes.input,
				label: classes.label,
				root: classes.root,
				...rest.classNames,
			}}
		/>
	)
}
