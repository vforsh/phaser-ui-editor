import { Button, Popover } from '@mantine/core'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EditableComponentType } from '../../../canvas/phaser/scenes/main/objects/components/base/EditableComponent'
import { ComponentList } from './ComponentList'

interface AddComponentButtonProps {
	onAddComponent: (type: EditableComponentType) => void
}

const PLUS_ICON = <Plus size={16} />

export function AddComponentButton({ onAddComponent }: AddComponentButtonProps) {
	const [opened, setOpened] = useState(false)

	return (
		<Popover opened={opened} onChange={setOpened} position="bottom" width={300} trapFocus shadow="md">
			<Popover.Target>
				<Button variant="light" leftSection={PLUS_ICON} onClick={() => setOpened((o) => !o)}>
					Add Component
				</Button>
			</Popover.Target>

			<Popover.Dropdown p="xs">
				<ComponentList
					opened={opened}
					onClose={() => setOpened(false)}
					onSelect={(type) => {
						onAddComponent(type)
						setOpened(false)
					}}
				/>
			</Popover.Dropdown>
		</Popover>
	)
}
