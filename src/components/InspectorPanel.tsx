import { Box, Group, Image, Stack, Text, useMantineTheme } from '@mantine/core'
import type { FileItem } from './AssetsPanel'
import { PanelTitle } from './PanelTitle'

interface InfoRowProps {
	label: string
	value: string | number
}

function InfoRow({ label, value }: InfoRowProps) {
	return (
		<Group justify="space-between" style={{ width: '100%' }}>
			<Text size="sm" c="dimmed">
				{label}
			</Text>
			<Text size="sm">{value}</Text>
		</Group>
	)
}

interface InspectorPanelProps {
	selectedAsset: FileItem | null
}

export default function InspectorPanel({ selectedAsset }: InspectorPanelProps) {
	const theme = useMantineTheme()

	if (!selectedAsset) {
		return (
			<Stack gap="xs" p="xs">
				<PanelTitle title="Inspector" />

				<Text c="dimmed" size="sm" ta="center" pt="xl">
					Select an item to inspect
				</Text>
			</Stack>
		)
	}

	if (selectedAsset.type === 'image' && selectedAsset.metadata) {
		const { dimensions, size, modified, url } = selectedAsset.metadata

		return (
			<Stack gap="xs" p="xs">
				<PanelTitle title="Inspector" />

				<Box
					style={{
						aspectRatio: '16/9',
						overflow: 'hidden',
						borderRadius: 4,
						backgroundColor: '#1A1B1E',
					}}
				>
					<Image src={url} alt={selectedAsset.name} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
				</Box>

				<Stack gap="md" pt="md">
					<Text fw={500} size="sm">
						Information
					</Text>

					<Stack gap="xs">
						<InfoRow label="Filename" value={selectedAsset.name} />
						<InfoRow label="Dimensions" value={`${dimensions?.width} × ${dimensions?.height}`} />
						<InfoRow label="Size" value={size} />
						<InfoRow label="Modified" value={modified} />
					</Stack>
				</Stack>
			</Stack>
		)
	}

	return (
		<Stack gap="xs" p="xs" radius="inherit">
			<PanelTitle title="Inspector" />

			<Stack gap="md" pt="md">
				<Text fw={500} size="sm">
					Information
				</Text>

				<Stack gap="xs">
					<InfoRow label="Filename" value={selectedAsset.name} />
					<InfoRow label="Type" value={selectedAsset.type} />
				</Stack>
			</Stack>
		</Stack>
	)
}
