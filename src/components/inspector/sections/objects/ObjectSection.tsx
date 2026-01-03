import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ActionIcon, Stack, TextInput, useMantineTheme } from '@mantine/core'
import { copyToClipboard } from '@utils/copy-to-clipboard'
import { Copy } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { BaseSectionProps } from '../BaseSection'
import { CheckboxCustom } from '../common/CheckboxCustom'

interface ObjectSectionProps extends BaseSectionProps<EditableObjectJson> {}

export function ObjectSection({ data }: ObjectSectionProps) {
	const theme = useMantineTheme()
	const snap = useSnapshot(data)

	const handleCopy = useCallback((text: string) => {
		copyToClipboard(text)
			.then(() => {
				console.log('Copied to clipboard')
			})
			.catch((error) => {
				console.error('Failed to copy to clipboard', error)
			})
	}, [])

	return (
		<Stack gap="xs">
			<TextInput
				label="Name"
				value={snap.name}
				onChange={(e) => (data.name = e.currentTarget.value)}
				size="xs"
				rightSection={useMemo(
					() => (
						<ActionIcon
							size="xs"
							variant="subtle"
							onClick={() => handleCopy(snap.type)}
							title="Copy type"
							color={theme.colors.gray[3]}
						>
							<Copy size={14} />
						</ActionIcon>
					),
					[handleCopy, snap.type, theme.colors.gray]
				)}
			/>

			<TextInput
				label="Id"
				value={snap.id}
				size="xs"
				disabled
				rightSection={useMemo(
					() => (
						<ActionIcon
							size="xs"
							variant="subtle"
							onClick={() => handleCopy(snap.id)}
							title="Copy ID"
							color={theme.colors.gray[3]}
						>
							<Copy size={14} />
						</ActionIcon>
					),
					[handleCopy, snap.id, theme.colors.gray]
				)}
			/>

			<TextInput label="Type" value={snap.type} size="xs" disabled />

			<CheckboxCustom
				label="Locked"
				checked={snap.locked}
				onChange={(checked) => (data.locked = checked)}
			/>
		</Stack>
	)
}
