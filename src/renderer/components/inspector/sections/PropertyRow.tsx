import { Group, Text, Tooltip } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'

import classes from './PropertyRow.module.css'

interface PropertyRowProps {
	label: string
	value: string | number
	/**
	 * The maximum length of the value to display.
	 */
	maxValueLength?: number
}

export function ReadonlyPropertyRow({ label, value, maxValueLength: maxLength = 35 }: PropertyRowProps) {
	const clipboard = useClipboard()
	const stringValue = String(value)
	const shouldTruncate = stringValue.length > maxLength
	const displayValue = shouldTruncate ? truncateValue(stringValue, maxLength) : stringValue

	const handleClick = () => {
		clipboard.copy(stringValue)
	}

	const tooltipLabel = clipboard.copied ? `${label} copied` : shouldTruncate ? stringValue : 'Click to copy'

	return (
		<Tooltip label={tooltipLabel}>
			<Group justify="space-between" wrap="nowrap" className={classes.row} onClick={handleClick}>
				<Text size="sm" c="dimmed" style={{ minWidth: 80 }}>
					{label}
				</Text>
				<Text size="sm" className={classes.valueText}>
					{displayValue}
				</Text>
			</Group>
		</Tooltip>
	)
}

function truncateValue(value: string, maxLength: number): string {
	return `...${value.slice(-maxLength + 3)}`
}
