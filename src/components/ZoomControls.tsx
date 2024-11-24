import { ActionIcon, Group, Tooltip, useMantineTheme } from '@mantine/core'
import { Maximize, ScanFace, ZoomIn, ZoomOut } from 'lucide-react'

interface ZoomControlsProps {
	onZoomIn: () => void
	onZoomOut: () => void
	onReset: () => void
	onFit: () => void
}

export default function ZoomControls({ onZoomIn, onZoomOut, onReset, onFit }: ZoomControlsProps) {
	const theme = useMantineTheme()

	return (
		<Group
			gap="0"
			p="0"
			style={{
				position: 'absolute',
				top: 6,
				right: 6,
				backgroundColor: theme.colors.dark[8],
				backdropFilter: 'blur(8px)',
				borderRadius: '4px',
				border: '1px solid rgba(255, 255, 255, 0.1)',
			}}
		>
			<Tooltip label="Reset zoom (1:1)">
				<ActionIcon variant="subtle" onClick={onReset} aria-label="Reset zoom">
					<ScanFace size={18} />
				</ActionIcon>
			</Tooltip>

			<Tooltip label="Fit to view">
				<ActionIcon variant="subtle" onClick={onFit} aria-label="Fit to view">
					<Maximize size={18} />
				</ActionIcon>
			</Tooltip>

			<Tooltip label="Zoom out">
				<ActionIcon variant="subtle" onClick={onZoomOut} aria-label="Zoom out">
					<ZoomOut size={18} />
				</ActionIcon>
			</Tooltip>

			<Tooltip label="Zoom in">
				<ActionIcon variant="subtle" onClick={onZoomIn} aria-label="Zoom in">
					<ZoomIn size={18} />
				</ActionIcon>
			</Tooltip>
		</Group>
	)
}
