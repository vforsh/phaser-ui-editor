import { Menu } from '@mantine/core'
import { ExternalLink, FileJson, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import type { FileItem } from '../types/files'

interface FileContextMenuProps {
	item: FileItem | null
	opened: boolean
	position: { x: number; y: number }
	onClose: () => void
	onAction: (action: string) => void
}

export default function FileContextMenu({ item, opened, position, onClose, onAction }: FileContextMenuProps) {
	if (!item) return null

	return (
		<Menu
			opened={opened}
			onClose={onClose}
			position="right-start"
			offset={4}
			shadow="md"
			styles={{
				dropdown: {
					position: 'fixed',
					left: position.x,
					top: position.y,
				},
			}}
			style={{
				zIndex: 100,
			}}
		>
			<Menu.Dropdown>
				<Menu.Item leftSection={item.type === 'folder' ? <FolderOpen size={16} /> : <FileJson size={16} />} onClick={() => onAction('open')}>
					Open
				</Menu.Item>
				<Menu.Item leftSection={<ExternalLink size={16} />} onClick={() => onAction('openInFiles')}>
					Open in Files
				</Menu.Item>
				<Menu.Divider />
				<Menu.Item leftSection={<Pencil size={16} />} onClick={() => onAction('rename')}>
					Rename
				</Menu.Item>
				<Menu.Item color="red" leftSection={<Trash2 size={16} />} onClick={() => onAction('delete')}>
					Delete
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	)
}
