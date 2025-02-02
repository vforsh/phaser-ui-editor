import { Group, Text, Tooltip } from '@mantine/core'

interface PropertyRowProps {
	label: string
	value: string | number
	/**
	 * The maximum length of the value to display.
	 */
	maxValueLength?: number
}

export function ReadonlyPropertyRow({ label, value, maxValueLength: maxLength = 35 }: PropertyRowProps) {
	const stringValue = String(value)
	const shouldTruncate = stringValue.length > maxLength
	const displayValue = shouldTruncate ? truncateValue(stringValue, maxLength) : stringValue

	return (
		<Group justify="space-between" wrap="nowrap">
			<Text size="sm" c="dimmed" style={{ minWidth: 80 }}>
				{label}
			</Text>
			<Tooltip label={shouldTruncate ? stringValue : null} disabled={!shouldTruncate}>
				<Text size="sm" style={{ flex: 1, textAlign: 'right' }}>
					{displayValue}
				</Text>
			</Tooltip>
		</Group>
	)
}

function truncateValue(value: string, maxLength: number): string {
	return `...${value.slice(-maxLength + 3)}`
}
