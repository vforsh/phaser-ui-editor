import { Group, Paper, ScrollArea, Stack } from '@mantine/core'
import { state, useSnapshot } from '@state/State'
import { ChevronRight } from 'lucide-react'
import { ContextMenuProvider, useContextMenu } from 'mantine-contextmenu'
import { nanoid } from 'nanoid'
import path from 'path-browserify-esm'
import { useEffect, useMemo, useState } from 'react'
import { Logger } from 'tslog'
import { Snapshot } from 'valtio'
import trpc from '../../trpc'
import { AssetTreeFolderData, getAssetById, removeAssetById, type AssetTreeItemData } from '../../types/assets'
import { PanelTitle } from './../PanelTitle'
import AssetContextMenu from './AssetContextMenu'
import { AssetsSearch } from './AssetsSearch'
import AssetTreeItem from './AssetTreeItem'
import { addAssetId } from './build-asset-tree'

interface ContextMenuState {
	opened: boolean
	position: { x: number; y: number }
	asset: Snapshot<AssetTreeItemData> | null
}

interface AssetsPanelProps {
	logger: Logger<{}>
}

// Helper function to flatten the asset tree - moved outside component for better performance
const getAllItems = (items: AssetTreeItemData[]): AssetTreeItemData[] => {
	const result: AssetTreeItemData[] = []

	const traverse = (items: AssetTreeItemData[]) => {
		items.forEach((item) => {
			result.push(item)
			if ('children' in item && Array.isArray(item.children)) {
				traverse(item.children)
			}
			if ('frames' in item && Array.isArray(item.frames)) {
				traverse(item.frames)
			}
		})
	}

	traverse(items)
	return result
}

export default function AssetsPanel({ logger }: AssetsPanelProps) {
	const assetsSnap = useSnapshot(state.assets)
	const { showContextMenu } = useContextMenu()
	const [itemToRename, setItemToRename] = useState<string | null>(null)
	const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
	const [searchResults, setSearchResults] = useState<AssetTreeItemData[]>([])
	const [isSearchMode, setIsSearchMode] = useState(false)
	const [contextMenu, setContextMenu] = useState<ContextMenuState>({
		opened: false,
		position: { x: 0, y: 0 },
		asset: null,
	})

	// Memoize flattened items for better search performance
	const allItems = useMemo(() => getAllItems(assetsSnap.items as AssetTreeItemData[]), [assetsSnap.items])

	// Initialize all folders as open
	// useEffect(() => {
	// 	const folders = new Set<string>()
	// 	const collectFolderPaths = (items: AssetTreeItemData[]) => {
	// 		items.forEach((item) => {
	// 			if (item.type === 'folder') {
	// 				folders.add(item.id)
	// 				collectFolderPaths(item.children)
	// 			}
	// 		})
	// 	}
	// 	collectFolderPaths(assetsSnap.items as AssetTreeItemData[])
	// 	setOpenFolders(folders)
	// }, [assetsSnap.items])

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

	const handleSelect = (item: Snapshot<AssetTreeItemData>, event: React.MouseEvent) => {
		const isCtrlPressed = event.ctrlKey || event.metaKey
		const isShiftPressed = event.shiftKey

		if (isCtrlPressed) {
			// Toggle selection of clicked item
			const newSelection = assetsSnap.selection.includes(item.id)
				? assetsSnap.selection.filter((id) => id !== item.id)
				: [...assetsSnap.selection, item.id]

			state.assets.selection = newSelection
			setLastSelectedId(item.id)
		} else if (isShiftPressed && lastSelectedId) {
			// Find all items between last selected and current
			const lastSelectedIndex = allItems.findIndex((i) => i.id === lastSelectedId)
			const currentIndex = allItems.findIndex((i) => i.id === item.id)

			if (lastSelectedIndex !== -1 && currentIndex !== -1) {
				const start = Math.min(lastSelectedIndex, currentIndex)
				const end = Math.max(lastSelectedIndex, currentIndex)
				const itemsToSelect = allItems.slice(start, end + 1)

				state.assets.selection = itemsToSelect.map((i) => i.id)
			}
		} else {
			// Regular single selection
			state.assets.selection = [item.id]
			setLastSelectedId(item.id)
		}

		state.assets.selectionChangedAt = Date.now()
		logger.info(`selected '${item.name}' (${item.type})`, item)
	}

	const handleContextMenu = (item: Snapshot<AssetTreeItemData>, position: { x: number; y: number }) => {
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
				setItemToRename(asset.id)
				break
			case 'delete':
				const shouldDelete =
					event.ctrlKey || event.metaKey || confirm(`Are you sure you want to delete ${asset.name}?`)
				if (shouldDelete) {
					await trpc.trash.mutate({ path: asset.path })
					removeAssetById(state.assets.items, asset.id)
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

	const handleRename = async (item: Snapshot<AssetTreeItemData>, newName: string) => {
		const oldPath = item.path
		const newPath = path.join(path.dirname(item.path), newName)

		// TODO handle renaming for assets that "consist" of multiple files like bitmap fonts and spritesheets

		// Update filesystem via trpc, it may fail - account for that
		// await trpc.rename.mutate({ oldPath, newPath })

		// Update state
		const asset = getAssetById(state.assets.items, item.id)
		if (asset) {
			asset.name = newName
			asset.path = newPath
		}

		setItemToRename(null)

		logger.info(`renamed '${item.name}' to '${newName}'`)
	}

	const rootContextMenu = [
		{
			key: 'create',
			title: 'Create',
			iconRight: <ChevronRight size={14} />,
			items: [
				{
					key: 'create-folder',
					title: 'Folder',
					onClick: () => {
						const folderName = 'folder-' + nanoid(5)
						const folderAsset: AssetTreeFolderData = addAssetId({
							type: 'folder',
							name: folderName,
							path: path.join(state.project!.assetsDir, folderName),
							children: [],
						})

						// add folder to filesystem via trpc, it may fail - account for that

						state.assets.items.push(folderAsset)
						state.assets.items.sort()

						// enter folder rename mode immediately after creation
						setItemToRename(folderAsset.id)
					},
				},
			],
		},
		{
			key: 'refresh',
			title: 'Refresh',
			onClick: () => {
				logger.info('refresh')
			},
		},
	]

	return (
		<ContextMenuProvider>
			<Paper style={{ height: '100%', display: 'flex', flexDirection: 'column' }} radius="sm">
				<Stack gap="xs" p="xs" style={{ height: '100%', minHeight: 0 }}>
					<Group justify="space-between" wrap="nowrap">
						{!isSearchMode && <PanelTitle title="Assets" />}
						<AssetsSearch
							flatAssets={allItems}
							onSearchChange={setSearchResults}
							onSearchModeChange={setIsSearchMode}
						/>
					</Group>
					<ScrollArea
						style={{ flex: 1 }}
						id="assets-panel-scroll-area"
						onContextMenu={(event) => {
							// display root context menu only if clicked on the scroll area
							if ((event.target as HTMLElement).parentElement?.id !== 'assets-panel-scroll-area') {
								return
							}

							showContextMenu(rootContextMenu)(event)
						}}
					>
						<Stack gap={0}>
							{isSearchMode
								? searchResults.map((asset) => (
										<AssetTreeItem
											key={asset.path}
											item={asset}
											onToggle={toggleFolder}
											onSelect={handleSelect}
											onContextMenu={handleContextMenu}
											onRename={handleRename}
											renamedAssetId={itemToRename}
											isSelected={assetsSnap.selection.includes(asset.id)}
											isLastChild={false}
											isOpen={openFolders.has(asset.id)}
											openFolders={openFolders}
										/>
									))
								: assetsSnap.items.map((asset, index) => (
										<AssetTreeItem
											key={asset.path}
											item={asset}
											onToggle={toggleFolder}
											onSelect={handleSelect}
											onContextMenu={handleContextMenu}
											onRename={handleRename}
											renamedAssetId={itemToRename}
											isSelected={assetsSnap.selection.includes(asset.id)}
											isLastChild={index === assetsSnap.items.length - 1}
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
		</ContextMenuProvider>
	)
}
