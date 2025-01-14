import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ActionIcon, Checkbox, Stack, TextInput, useMantineTheme } from '@mantine/core'
import { copyToClipboard } from '@utils/copy-to-clipboard'
import { Copy } from 'lucide-react'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'

interface ObjectSectionProps extends BaseSectionProps<EditableObjectJson> {}

export function ObjectSection({ data }: ObjectSectionProps) {
	const theme = useMantineTheme()
	const snap = useSnapshot(data)

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
				value={snap.name}
				onChange={(e) => (data.name = e.currentTarget.value)}
				size="xs"
				rightSection={
					<ActionIcon
						size="xs"
						variant="subtle"
						onClick={() => handleCopy(snap.type)}
						title="Copy type"
						color={theme.colors.gray[3]}
					>
						<Copy size={14} />
					</ActionIcon>
				}
			/>

			<TextInput
				label="Id"
				value={snap.id}
				size="xs"
				disabled
				rightSection={
					<ActionIcon
						size="xs"
						variant="subtle"
						onClick={() => handleCopy(snap.id)}
						title="Copy ID"
						color={theme.colors.gray[3]}
					>
						<Copy size={14} />
					</ActionIcon>
				}
			/>

			<TextInput label="Type" value={snap.type} size="xs" disabled />

			<Checkbox
				label="Locked"
				checked={snap.locked}
				onChange={(e) => (data.locked = e.currentTarget.checked)}
				size="xs"
			/>
		</Stack>
	)
}
