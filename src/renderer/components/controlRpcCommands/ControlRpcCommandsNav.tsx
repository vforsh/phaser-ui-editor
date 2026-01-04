import { Group, Stack, Text, UnstyledButton } from '@mantine/core'

import type { ControlRpcGroup, GroupInfo } from './controlRpcCommandsModel'

import classes from './ControlRpcCommandsNav.module.css'

interface ControlRpcCommandsNavProps {
	groups: GroupInfo[]
	activeGroup: ControlRpcGroup
	onSelect: (groupId: ControlRpcGroup) => void
}

export function ControlRpcCommandsNav({ groups, activeGroup, onSelect }: ControlRpcCommandsNavProps) {
	return (
		<Stack gap={0} style={{ width: '100%' }}>
			{groups.map((group) => {
				const isActive = group.id === activeGroup
				return (
					<UnstyledButton
						key={group.id}
						onClick={() => onSelect(group.id)}
						className={`${classes.button} ${isActive ? classes.buttonActive : ''}`}
					>
						<Group gap="xs" wrap="nowrap" style={{ width: '100%' }}>
							<Text size="sm" fw={isActive ? 600 : 500} style={{ flex: 1 }}>
								{group.label}
							</Text>
							<Text size="xs" c="dimmed">
								{group.count}
							</Text>
						</Group>
					</UnstyledButton>
				)
			})}
		</Stack>
	)
}
