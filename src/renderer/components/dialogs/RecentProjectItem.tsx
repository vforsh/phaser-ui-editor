import { Group, Text, Tooltip, UnstyledButton } from '@mantine/core'
import { AlertTriangle, X } from 'lucide-react'
import { forwardRef, useState } from 'react'

interface RecentProjectItemProps {
	name: string
	dir: string
	exists: boolean
	onSelect: () => void
	onRemove: () => void
	focused?: boolean
}

export const RecentProjectItem = forwardRef<HTMLButtonElement, RecentProjectItemProps>(
	({ name, dir, exists, onSelect, onRemove, focused }, ref) => {
		const [hovered, setHovered] = useState(false)

		return (
			<UnstyledButton
				ref={ref}
				onClick={onSelect}
				style={{
					width: '100%',
					borderRadius: 'var(--mantine-radius-sm)',
					padding: 'var(--mantine-spacing-xs)',
					backgroundColor: 'var(--mantine-color-dark-6)',
					transition: 'background-color 150ms ease',
					// TODO add hover effect
				}}
			>
				<Group justify="space-between" wrap="nowrap">
					<div style={{ flex: 1, minWidth: 0 }}>
						<Text size="sm" lineClamp={1} style={{ color: 'inherit' }}>
							{name}
						</Text>
						<Text size="xs" c="dimmed" lineClamp={1}>
							{dir}
						</Text>
					</div>

					<Group gap="xs">
						{!exists && (
							<Tooltip label="Directory not found">
								<AlertTriangle size={16} color="var(--mantine-color-yellow-5)" />
							</Tooltip>
						)}
						<Tooltip label="Remove from recent">
							<div
								role="button"
								tabIndex={0}
								onClick={(e) => {
									e.stopPropagation()
									onRemove()
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.stopPropagation()
										onRemove()
									}
								}}
								onMouseEnter={() => setHovered(true)}
								onMouseLeave={() => setHovered(false)}
								style={{
									color: 'var(--mantine-color-gray-5)',
									cursor: 'pointer',
									padding: '4px',
									borderRadius: 'var(--mantine-radius-sm)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transition: 'background-color 150ms ease',
									backgroundColor: hovered ? 'var(--mantine-color-dark-4)' : 'transparent',
								}}
							>
								<X size={16} />
							</div>
						</Tooltip>
					</Group>
				</Group>
			</UnstyledButton>
		)
	},
)
