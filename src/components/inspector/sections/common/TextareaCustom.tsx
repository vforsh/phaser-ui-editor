import { Textarea, TextareaProps } from '@mantine/core'
import classes from './TextareaCustom.module.css'

interface TextareaCustomProps extends TextareaProps {}

/**
 * Textarea with custom styling to match other custom form components
 */
export function TextareaCustom(props: TextareaCustomProps) {
	return (
		<Textarea
			{...props}
			classNames={{
				input: classes.input,
			}}
		/>
	)
}
