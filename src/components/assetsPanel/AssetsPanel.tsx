import { Paper, ScrollArea, Stack } from '@mantine/core'
import { state } from '@state/State'
import path from 'path-browserify-esm'
import { useEffect, useState } from 'react'
import { Logger } from 'tslog'
import trpc from '../../trpc'
import { removeAssetById, type AssetTreeItemData } from '../../types/assets'
import { PanelTitle } from './../PanelTitle'
import AssetContextMenu from './AssetContextMenu'
import AssetTreeItem from './AssetTreeItem'

interface ContextMenuState {
	opened: boolean
	position: { x: number; y: number }
	asset: AssetTreeItemData | null
}

interface AssetsPanelProps {
	logger: Logger<{}>
	onSelectAsset: (item: AssetTreeItemData | null) => void
	assets: AssetTreeItemData[]
}

export default function AssetsPanel({ logger, onSelectAsset, assets }: AssetsPanelProps) {
	const [selectedItem, setSelectedItem] = useState<AssetTreeItemData | null>(null)
	const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
	const [contextMenu, setContextMenu] = useState<ContextMenuState>({
		opened: false,
		position: { x: 0, y: 0 },
		asset: null,
	})

	// Initialize all folders as open
	useEffect(() => {
		const folders = new Set<string>()
		const collectFolderPaths = (items: AssetTreeItemData[]) => {
			items.forEach((item) => {
				if (item.type === 'folder') {
					folders.add(item.id)
					collectFolderPaths(item.children)
				}
			})
		}
		collectFolderPaths(assets)
		setOpenFolders(folders)
	}, [assets])

	const toggleFolder = (folderId: string) => {
		setOpenFolders((prev) => {
			const next = new Set(prev)
			if (next.has(folderId)) {
				next.delete(folderId)
			} else {
				next.add(folderId)
			}
			return next
		})
	}

	const handleSelect = (item: AssetTreeItemData) => {
		setSelectedItem(item)
		onSelectAsset(item)
		logger.info(`selected '${item.name}' (${item.type})`, item)
	}

	const handleContextMenu = (item: AssetTreeItemData, position: { x: number; y: number }) => {
		setContextMenu({
			opened: true,
			position,
			asset: item,
		})
	}

	const handleContextMenuAction = async (action: string, event: React.MouseEvent<HTMLButtonElement>) => {
		const asset = contextMenu.asset
		if (!asset) {
			return
		}

		if (BOLT) {
			console.log('Context menu action:', action, asset)
			setContextMenu({ ...contextMenu, opened: false })
			return
		}

		switch (action) {
			case 'open':
				await trpc.open.query({ path: asset.path })
				break
			case 'openInFiles':
				const pathToOpen = path.dirname(asset.path)
				await trpc.open.query({ path: pathToOpen })
				break
			case 'openInTexturePacker':
				if (
					(asset.type === 'spritesheet' ||
						asset.type === 'spritesheet-folder' ||
						asset.type === 'spritesheet-frame') &&
					asset.project
				) {
					await trpc.open.query({ path: asset.project })
				}
				break
			case 'rename':
				// TODO allow to rename inplace (without opening a dialog)
				const extension = path.extname(asset.path)
				const newName = prompt(`Enter new name for '${asset.name}'`, asset.name.replace(extension, ''))
				if (newName) {
					// const { error } = await until(() =>
					// 	trpc.rename.mutate({ oldPath: asset.path, newPath: newName + extension })
					// )
					// if (error) {
					// 	logger.error(
					// 		`failed to rename '${asset.name}' to '${newName + extension}' (${getErrorLog(error)})`
					// 	)
					// } else {
					// 	logger.info(`renamed '${asset.name}' to '${newName + extension}'`)
					// }

					logger.info(`renamed '${asset.name}' to '${newName + extension}'`)
				}
				break
			case 'delete':
				const shouldDelete =
					event.ctrlKey || event.metaKey || confirm(`Are you sure you want to delete ${asset.name}?`)
				if (shouldDelete) {
					await trpc.trash.mutate({ path: asset.path })
					removeAssetById(state.assets, asset.id)
				}
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
						{assets.map((asset, index) => (
							<AssetTreeItem
								key={asset.path}
								item={asset}
								onToggle={toggleFolder}
								onSelect={handleSelect}
								onContextMenu={handleContextMenu}
								selectedItem={selectedItem}
								isLastChild={index === assets.length - 1}
								isOpen={openFolders.has(asset.id)}
								openFolders={openFolders}
							/>
						))}
					</Stack>
				</ScrollArea>
			</Stack>

			<AssetContextMenu
				asset={contextMenu.asset}
				opened={contextMenu.opened}
				position={contextMenu.position}
				onClose={() => setContextMenu({ ...contextMenu, opened: false })}
				onAction={handleContextMenuAction}
			/>
		</Paper>
	)
}
