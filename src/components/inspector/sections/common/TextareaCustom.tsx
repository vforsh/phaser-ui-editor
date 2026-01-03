import { Textarea, TextareaProps } from '@mantine/core'
import { usePreserveCursor } from './usePreserveCursor'
import classes from './TextareaCustom.module.css'

interface TextareaCustomProps extends TextareaProps {}

/**
 * Textarea with custom styling to match other custom form components
 */
export function TextareaCustom(props: TextareaCustomProps) {
	const handleChange = usePreserveCursor()

	const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		handleChange(e, (value) => props.onChange?.(e))
	}

	return (
		<Textarea
			{...props}
			onChange={onChange}
			classNames={{
				input: classes.input,
			}}
		/>
	)
}
