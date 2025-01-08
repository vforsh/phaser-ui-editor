import { Checkbox, Stack, TextInput } from '@mantine/core'

interface ObjectProps {
	name: string
	readonly type: string
	locked: boolean
}

interface ObjectSectionProps {
	object: ObjectProps
	onChange: (properties: Partial<ObjectProps>) => void
}

export function ObjectSection({ object, onChange }: ObjectSectionProps) {
	return (
		<Stack gap="xs">
			<TextInput
				label="Name"
				value={object.name}
				onChange={(e) => onChange({ name: e.currentTarget.value })}
				size="xs"
			/>

			<TextInput label="Type" value={object.type} size="xs" disabled />

			<Checkbox
				label="Locked"
				checked={object.locked}
				onChange={(e) => onChange({ locked: e.currentTarget.checked })}
				size="xs"
			/>
		</Stack>
	)
}
