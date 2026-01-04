import { ActionIcon, Group, Tooltip, useMantineTheme } from '@mantine/core'
import { AlignCenterVertical, AlignEndVertical, AlignHorizontalDistributeCenter, AlignStartVertical } from 'lucide-react'

interface AlignmentControlsProps {
	orientation: 'horizontal' | 'vertical'
	onAlignStart: () => void
	onAlignCenter: () => void
	onAlignEnd: () => void
	onDistribute: () => void
}

export default function AlignmentControls({ orientation, onAlignStart, onAlignCenter, onAlignEnd, onDistribute }: AlignmentControlsProps) {
	const theme = useMantineTheme()
	const isHorizontal = orientation === 'horizontal'
	const iconColor = theme.colors.gray[5]
	const iconSize = 18

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
							right: -36,
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
					<AlignStartVertical size={iconSize} color={iconColor} />
				</ActionIcon>
			</Tooltip>

			<Tooltip label="Align center">
				<ActionIcon variant="subtle" onClick={onAlignCenter} aria-label="Align center">
					<AlignCenterVertical size={iconSize} color={iconColor} />
				</ActionIcon>
			</Tooltip>

			<Tooltip label={isHorizontal ? 'Align right' : 'Align bottom'}>
				<ActionIcon variant="subtle" onClick={onAlignEnd} aria-label={isHorizontal ? 'Align right' : 'Align bottom'}>
					<AlignEndVertical size={iconSize} color={iconColor} />
				</ActionIcon>
			</Tooltip>

			<Tooltip label={`Distribute centers`}>
				<ActionIcon variant="subtle" onClick={onDistribute} aria-label="Distribute centers">
					<AlignHorizontalDistributeCenter size={iconSize} color={iconColor} />
				</ActionIcon>
			</Tooltip>
		</Group>
	)
}
