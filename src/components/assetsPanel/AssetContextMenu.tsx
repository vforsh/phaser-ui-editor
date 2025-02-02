import { Menu } from '@mantine/core'
import { ExternalLink, FileJson, FolderOpen, Image, TextCursorInput, Trash2 } from 'lucide-react'
import { match } from 'ts-pattern'
import type { Snapshot } from 'valtio'
import type { AssetTreeItemData } from '../../types/assets'

interface AssetContextMenuProps {
	asset: Snapshot<AssetTreeItemData> | null
	opened: boolean
	position: { x: number; y: number }
	onClose: () => void
	onAction: (action: string, event: React.MouseEvent<HTMLButtonElement>) => void
}

export default function AssetContextMenu({ asset, opened, position, onClose, onAction }: AssetContextMenuProps) {
	if (!asset) return null

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
			// @ts-expect-error
			style={{
				zIndex: 100,
			}}
		>
			<Menu.Dropdown>
				<Menu.Item
					leftSection={asset.type === 'folder' ? <FolderOpen size={16} /> : <FileJson size={16} />}
					onClick={(event) => onAction('open', event)}
				>
					Open
				</Menu.Item>
				<Menu.Item leftSection={<ExternalLink size={16} />} onClick={(event) => onAction('openInFiles', event)}>
					Open in Files
				</Menu.Item>
				{(asset.type === 'spritesheet' ||
					asset.type === 'spritesheet-folder' ||
					asset.type === 'spritesheet-frame') && (
					<>
						<Menu.Item
							leftSection={<Image size={16} />}
							onClick={(event) => onAction('openInTexturePacker', event)}
						>
							Open in TexturePacker
						</Menu.Item>
					</>
				)}
				<Menu.Item
					leftSection={<TextCursorInput size={16} />}
					onClick={(event) => onAction('rename', event)}
					disabled={canBeRenamed(asset) === false}
				>
					Rename
				</Menu.Item>
				<Menu.Item
					color="red"
					leftSection={<Trash2 size={16} />}
					onClick={(event) => onAction('delete', event)}
				>
					Delete
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	)
}

function canBeRenamed(asset: Snapshot<AssetTreeItemData>) {
	return match(asset.type)
		.with('folder', () => true)
		.with('spritesheet', () => false)
		.with('spritesheet-folder', () => false)
		.with('spritesheet-frame', () => false)
		.with('image', () => false)
		.with('json', () => false)
		.with('xml', () => false)
		.with('prefab', () => false)
		.with('web-font', () => false)
		.with('bitmap-font', () => false)
		.with('file', () => false)
		.exhaustive()
}
