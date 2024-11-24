import { ActionIcon, Group, Tooltip, useMantineTheme } from '@mantine/core'
import {
	AlignEndHorizontal,
	AlignEndVertical,
	AlignHorizontalSpaceAround,
	AlignStartHorizontal,
	AlignStartVertical,
	AlignVerticalSpaceAround,
} from 'lucide-react'

interface AlignmentControlsProps {
	orientation: 'horizontal' | 'vertical'
	onAlignStart: () => void
	onAlignCenter: () => void
	onAlignEnd: () => void
}

export default function AlignmentControls({ orientation, onAlignStart, onAlignCenter, onAlignEnd }: AlignmentControlsProps) {
	const theme = useMantineTheme()
	const isHorizontal = orientation === 'horizontal'

	return (
		<Group
			gap="0"
			p="0"
			style={{
				position: 'absolute',
				...(isHorizontal
					? {
							top: 6,
							left: '50%',
							transform: 'translateX(-50%)',
						}
					: {
							left: 6,
							top: '50%',
							transform: 'translateY(-50%) rotate(90deg)',
						}),
				backgroundColor: theme.colors.dark[8],
				backdropFilter: 'blur(8px)',
				borderRadius: '4px',
				border: '1px solid rgba(255, 255, 255, 0.1)',
			}}
		>
			<Tooltip label={isHorizontal ? 'Align left' : 'Align top'}>
				<ActionIcon variant="subtle" onClick={onAlignStart} aria-label={isHorizontal ? 'Align left' : 'Align top'}>
					{isHorizontal ? <AlignStartHorizontal size={18} /> : <AlignStartVertical size={18} />}
				</ActionIcon>
			</Tooltip>

			<Tooltip label="Align center">
				<ActionIcon variant="subtle" onClick={onAlignCenter} aria-label="Align center">
					{isHorizontal ? <AlignHorizontalSpaceAround size={18} /> : <AlignVerticalSpaceAround size={18} />}
				</ActionIcon>
			</Tooltip>

			<Tooltip label={isHorizontal ? 'Align right' : 'Align bottom'}>
				<ActionIcon variant="subtle" onClick={onAlignEnd} aria-label={isHorizontal ? 'Align right' : 'Align bottom'}>
					{isHorizontal ? <AlignEndHorizontal size={18} /> : <AlignEndVertical size={18} />}
				</ActionIcon>
			</Tooltip>
		</Group>
	)
}
