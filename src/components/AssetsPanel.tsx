import { Paper, ScrollArea, Stack } from '@mantine/core'
import { useEffect, useState } from 'react'
import { mockFiles } from '../data/mockFiles'
import type { FileItem } from '../types/files'
import FileContextMenu from './FileContextMenu'
import FileTreeItem from './FileTreeItem'
import { PanelTitle } from './PanelTitle'

interface ContextMenuState {
	opened: boolean
	position: { x: number; y: number }
	item: FileItem | null
}

interface AssetsPanelProps {
	onSelectAsset: (item: FileItem | null) => void
}

export default function AssetsPanel({ onSelectAsset }: AssetsPanelProps) {
	const [files, setFiles] = useState(mockFiles)
	const [selectedItem, setSelectedItem] = useState<FileItem | null>(null)
	const [contextMenu, setContextMenu] = useState<ContextMenuState>({
		opened: false,
		position: { x: 0, y: 0 },
		item: null,
	})

	const toggleFolder = (targetItem: FileItem) => {
		const updateFiles = (items: FileItem[]): FileItem[] => {
			return items.map((item) => {
				if (item === targetItem) {
					return { ...item, isOpen: !item.isOpen }
				}
				if (item.children) {
					return { ...item, children: updateFiles(item.children) }
				}
				return item
			})
		}

		setFiles(updateFiles(files))
	}

	const handleSelect = (item: FileItem) => {
		setSelectedItem(item)
		onSelectAsset(item)
	}

	const handleContextMenu = (item: FileItem, position: { x: number; y: number }) => {
		setContextMenu({
			opened: true,
			position,
			item,
		})
	}

	const handleContextAction = (action: string) => {
		if (!contextMenu.item) return

		switch (action) {
			case 'open':
				console.log('Open:', contextMenu.item.name)
				break
			case 'openInFiles':
				console.log('Open in files:', contextMenu.item.name)
				break
			case 'rename':
				console.log('Rename:', contextMenu.item.name)
				break
			case 'delete':
				console.log('Delete:', contextMenu.item.name)
				break
		}
		setContextMenu({ ...contextMenu, opened: false })
	}

	useEffect(() => {
		const onClick = () => {
			if (contextMenu.opened) {
				setContextMenu({ ...contextMenu, opened: false })
			}
		}

		window.addEventListener('click', onClick)
		return () => window.removeEventListener('click', onClick)
	}, [contextMenu.opened])

	return (
		<Paper style={{ height: '100%', display: 'flex', flexDirection: 'column' }} radius="sm">
			<Stack gap="xs" p="xs" style={{ height: '100%', minHeight: 0 }}>
				<PanelTitle title="Assets" />
				<ScrollArea style={{ flex: 1 }}>
					<Stack gap={0}>
						{files.map((file, index, arr) => (
							<FileTreeItem
								key={file.name + index}
								item={file}
								onToggle={toggleFolder}
								onSelect={handleSelect}
								onContextMenu={handleContextMenu}
								selectedItem={selectedItem}
								isLastChild={index === arr.length - 1}
							/>
						))}
					</Stack>
				</ScrollArea>
			</Stack>

			<FileContextMenu
				item={contextMenu.item}
				opened={contextMenu.opened}
				position={contextMenu.position}
				onClose={() => setContextMenu({ ...contextMenu, opened: false })}
				onAction={handleContextAction}
			/>
		</Paper>
	)
}
