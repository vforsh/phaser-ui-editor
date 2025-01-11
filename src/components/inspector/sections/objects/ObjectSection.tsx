import { ActionIcon, Checkbox, Stack, TextInput, useMantineTheme } from '@mantine/core'
import { copyToClipboard } from '@utils/copy-to-clipboard'
import { Copy } from 'lucide-react'
import { BaseSectionProps } from '../BaseSection'

export interface ObjectSectionData {
	name: string
	readonly type: string
	readonly id: string
	locked: boolean
}

interface ObjectSectionProps extends BaseSectionProps<ObjectSectionData> {}

export function ObjectSection({ data, onChange }: ObjectSectionProps) {
	const theme = useMantineTheme()

	const handleCopy = (text: string) => {
		copyToClipboard(text)
			.then(() => {
				console.log('Copied to clipboard')
			})
			.catch((error) => {
				console.error('Failed to copy to clipboard', error)
			})
	}

	return (
		<Stack gap="xs">
			<TextInput
				label="Name"
				value={data.name}
				onChange={(e) => onChange('name', e.currentTarget.value, data.name)}
				size="xs"
				rightSection={
					<ActionIcon
						size="xs"
						variant="subtle"
						onClick={() => handleCopy(data.type)}
						title="Copy type"
						color={theme.colors.gray[3]}
					>
						<Copy size={14} />
					</ActionIcon>
				}
			/>

			<TextInput
				label="Id"
				value={data.id}
				size="xs"
				disabled
				rightSection={
					<ActionIcon
						size="xs"
						variant="subtle"
						onClick={() => handleCopy(data.id)}
						title="Copy ID"
						color={theme.colors.gray[3]}
					>
						<Copy size={14} />
					</ActionIcon>
				}
			/>

			<TextInput label="Type" value={data.type} size="xs" disabled />

			<Checkbox
				label="Locked"
				checked={data.locked}
				onChange={(e) => onChange('locked', e.currentTarget.checked, data.locked)}
				size="xs"
			/>
		</Stack>
	)
}
