import { Divider, Group, Paper, ScrollArea, Stack } from '@mantine/core'
import { useWindowEvent } from '@mantine/hooks'
import { until } from '@open-draft/until'
import { state, useSnapshot } from '@state/State'
import { getErrorLog } from '@utils/error/utils'
import {
	ChevronRight,
	Cuboid,
	ExternalLink,
	FileJson,
	FilePlus2,
	Folder,
	FolderOpen,
	Image,
	RefreshCcw,
	TextCursorInput,
	Trash2,
} from 'lucide-react'
import { ContextMenuItemOptions, ContextMenuProvider, useContextMenu } from 'mantine-contextmenu'
import { nanoid } from 'nanoid'
import path from 'path-browserify-esm'
import { useEffect, useMemo, useRef, useState } from 'react'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { Snapshot } from 'valtio'
import trpc from '../../trpc'
import {
	AssetTreeFolderData,
	AssetTreePrefabData,
	getAssetById,
	getAssetChildren,
	isAssetOfType,
	removeAssetById,
	type AssetTreeItemData,
} from '../../types/assets'
import { PanelTitle } from './../PanelTitle'
import { AssetsSearch } from './AssetsSearch'
import AssetTreeItem from './AssetTreeItem'
import { addAssetId } from './build-asset-tree'

interface AssetsPanelProps {
	logger: Logger<{}>
}

// Helper function to flatten the asset tree - moved outside component for better performance
const flattenAssets = (items: Snapshot<AssetTreeItemData>[]): Snapshot<AssetTreeItemData>[] => {
	const result: Snapshot<AssetTreeItemData>[] = []

	const traverse = (items: Snapshot<AssetTreeItemData>[]) => {
		items.forEach((item) => {
			result.push(item)

			const children = getAssetChildren(item as AssetTreeItemData)
			if (children) {
				traverse(children)
			}
		})
	}

	traverse(items)

	return result
}

// Helper function to get all parent folder IDs for an asset
const getParentFolderIds = (assets: AssetTreeItemData[], targetId: string): Set<string> => {
	const folderIds = new Set<string>()

	const findParents = (items: AssetTreeItemData[], targetId: string): boolean => {
		for (const item of items) {
			if (item.id === targetId) {
				return true
			}

			if ('children' in item) {
				if (findParents(item.children, targetId)) {
					folderIds.add(item.id)
					return true
				}
			}

			if ('frames' in item) {
				if (findParents(item.frames, targetId)) {
					folderIds.add(item.id)
					return true
				}
			}
		}

		return false
	}

	findParents(assets, targetId)

	return folderIds
}

const getParentFolder = (asset: Snapshot<AssetTreeItemData>, allAssetsFlattened: Snapshot<AssetTreeItemData>[]) => {
	const parentFolderPath = match(asset)
		.with({ type: 'folder' }, ({ path }) => path)
		.with({ type: 'spritesheet' }, () => path.dirname(asset.path))
		.with({ type: 'spritesheet-folder' }, ({ imagePath }) => path.dirname(imagePath))
		.with({ type: 'spritesheet-frame' }, ({ imagePath }) => path.dirname(imagePath))
		.with({ type: 'image' }, () => path.dirname(asset.path))
		.with({ type: 'json' }, () => path.dirname(asset.path))
		.with({ type: 'xml' }, () => path.dirname(asset.path))
		.with({ type: 'prefab' }, () => path.dirname(asset.path))
		.with({ type: 'web-font' }, () => path.dirname(asset.path))
		.with({ type: 'bitmap-font' }, () => path.dirname(asset.path))
		.with({ type: 'file' }, () => path.dirname(asset.path))
		.exhaustive()

	return allAssetsFlattened.find((item) => item.type === 'folder' && item.path === parentFolderPath) as
		| Snapshot<AssetTreeFolderData>
		| undefined
}

export default function AssetsPanel({ logger }: AssetsPanelProps) {
	const assetsSnap = useSnapshot(state.assets)
	const { showContextMenu } = useContextMenu()
	const [itemToRename, setItemToRename] = useState<string | null>(null)
	const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
	const [searchResults, setSearchResults] = useState<Snapshot<AssetTreeItemData>[]>([])
	const [isSearchMode, setIsSearchMode] = useState(false)
	const [focusedIndex, setFocusedIndex] = useState<number>(-1)
	const searchRef = useRef<{ handleExpand: () => void; blur: () => void; focus: () => void } | null>(null)

	// Memoize flattened items for better search performance
	const allAssetsFlattened = useMemo(() => flattenAssets(assetsSnap.items as AssetTreeItemData[]), [assetsSnap.items])

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
			const lastSelectedIndex = allAssetsFlattened.findIndex((i) => i.id === lastSelectedId)
			const currentIndex = allAssetsFlattened.findIndex((i) => i.id === item.id)

			if (lastSelectedIndex !== -1 && currentIndex !== -1) {
				const start = Math.min(lastSelectedIndex, currentIndex)
				const end = Math.max(lastSelectedIndex, currentIndex)
				const itemsToSelect = allAssetsFlattened.slice(start, end + 1)

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

	const getAssetContextMenuItems = (asset: Snapshot<AssetTreeItemData>) => {
		const canBeRenamed = match(asset.type)
			.with('folder', () => true)
			.with('spritesheet', () => true)
			.with('spritesheet-folder', () => false)
			.with('spritesheet-frame', () => false)
			.with('image', () => true)
			.with('json', () => true)
			.with('xml', () => true)
			.with('prefab', () => true)
			.with('web-font', () => true)
			.with('bitmap-font', () => false)
			.with('file', () => true)
			.exhaustive()

		const menuItems: ContextMenuItemOptions[] = [
			{
				key: 'create',
				icon: <FilePlus2 size={16} />,
				title: 'Create',
				iconRight: <ChevronRight size={14} />,
				items: [
					{
						key: 'create-folder',
						icon: <Folder size={16} />,
						title: 'Folder',
						onClick: async () => {
							const parentFolderAssetSnap =
								asset.type === 'folder' ? asset : getParentFolder(asset, allAssetsFlattened)
							if (!parentFolderAssetSnap) {
								return
							}

							const parentFolderAsset = getAssetById(state.assets.items, parentFolderAssetSnap.id)
							if (!parentFolderAsset || !isAssetOfType(parentFolderAsset, 'folder')) {
								return
							}

							const folderName = 'folder-' + nanoid(5)
							const folderAsset: AssetTreeFolderData = addAssetId({
								type: 'folder',
								name: folderName,
								path: path.join(parentFolderAsset.path, folderName),
								children: [],
							})

							const { error } = await until(() => trpc.createFolder.mutate({ path: folderAsset.path }))
							if (error) {
								logger.error(
									`error creating folder at '${folderAsset.path}' (${getErrorLog(error)})`,
									error
								)
								// TODO show error toast
								return
							}

							parentFolderAsset.children.push(folderAsset)
							// TODO sort folder children

							logger.info(`created folder at '${folderAsset.path}'`)

							// enter folder rename mode immediately after creation
							startRename(folderAsset)
						},
					},
					{
						key: 'create-prefab',
						title: 'Prefab',
						icon: <Cuboid size={16} />,
						onClick: async () => {
							const folderAssetSnap =
								asset.type === 'folder' ? asset : getParentFolder(asset, allAssetsFlattened)
							if (!folderAssetSnap) {
								return
							}

							const folderAsset = getAssetById(state.assets.items, folderAssetSnap.id)
							if (!folderAsset || !isAssetOfType(folderAsset, 'folder')) {
								return
							}

							const prefabNameTemp = `prefab-${nanoid(5)}.prefab.json`
							const prefabAsset: AssetTreePrefabData = addAssetId({
								type: 'prefab',
								name: prefabNameTemp,
								path: path.join(folderAsset.path, prefabNameTemp),
							})

							logger.info(`creating prefab at '${prefabAsset.path}'`)

							const { error } = await until(() =>
								trpc.createTextFile.mutate({ path: prefabAsset.path, content: '{}' })
							)
							if (error) {
								logger.error(
									`error creating prefab at '${prefabAsset.path}' (${getErrorLog(error)})`,
									error
								)
								// TODO show error toast
								return
							}

							folderAsset.children.push(prefabAsset)
							// TODO sort folder children

							// enter rename mode immediately after creation
							startRename(prefabAsset)
						},
					},
				],
			},
			{
				key: 'open',
				title: 'Open',
				icon: asset.type === 'folder' ? <FolderOpen size={16} /> : <FileJson size={16} />,
				onClick: async () => {
					await trpc.open.query({ path: asset.path })
				},
			},
			{
				key: 'openInFiles',
				title: 'Open in Files',
				icon: <ExternalLink size={16} />,
				onClick: async () => {
					const pathToOpen = path.dirname(asset.path)
					await trpc.open.query({ path: pathToOpen })
				},
			},
			...(asset.type === 'spritesheet' ||
			asset.type === 'spritesheet-folder' ||
			asset.type === 'spritesheet-frame'
				? [
						{
							key: 'openInTexturePacker',
							title: 'Open in TexturePacker',
							icon: <Image size={16} />,
							onClick: async () => {
								if (asset.project) {
									await trpc.open.query({ path: asset.project })
								}
							},
						},
					]
				: []),
			{
				key: 'rename',
				title: 'Rename',
				icon: <TextCursorInput size={16} />,
				disabled: !canBeRenamed,
				onClick: () => {
					setItemToRename(asset.id)
				},
			},
			{
				key: 'delete',
				title: 'Delete',
				icon: <Trash2 size={16} />,
				color: 'red',
				onClick: async (event) => {
					const shouldDelete =
						event.ctrlKey || event.metaKey || confirm(`Are you sure you want to delete ${asset.name}?`)
					if (shouldDelete) {
						const absPath = path.join(state.projectDir!, asset.path)
						const { error } = await until(() => trpc.trash.mutate({ path: absPath }))
						if (error) {
							logger.error(`error deleting asset at '${asset.path}' (${getErrorLog(error)})`, error)
							// TODO show error toast
							return
						}

						removeAssetById(state.assets.items, asset.id)
						// forceUpdate()
					}
				},
			},
		]

		return menuItems
	}

	const startRename = (item: Snapshot<AssetTreeItemData>) => {
		const parentFolderIds = getParentFolderIds(state.assets.items, item.id)
		setOpenFolders((prev) => {
			const next = new Set(prev)
			parentFolderIds.forEach((id) => next.add(id))
			return next
		})

		setItemToRename(item.id)
	}

	const completeRename = async (item: Snapshot<AssetTreeItemData>, newName: string) => {
		const oldPath = item.path
		const newPath =
			item.type === 'folder' ? oldPath.replace(item.name, newName) : path.join(path.dirname(item.path), newName)

		logger.info(`renaming '${item.name}' to '${newName}', oldPath: '${oldPath}', newPath: '${newPath}'`)

		const oldPathAbs = path.join(state.projectDir!, oldPath)
		const newPathAbs = path.join(state.projectDir!, newPath)
		const { error } = await until(() => trpc.rename.mutate({ oldPath: oldPathAbs, newPath: newPathAbs }))
		if (error) {
			logger.error(`error renaming '${item.name}' to '${newName}' (${getErrorLog(error)})`, error)
			// TODO show error toast
			return
		}

		// Update state
		const asset = getAssetById(state.assets.items, item.id)
		if (asset) {
			asset.name = newName
			asset.path = newPath
		}

		setItemToRename(null)

		logger.info(`renamed '${item.name}' to '${newName}'`)
	}

	const rootContextMenu: ContextMenuItemOptions[] = [
		{
			key: 'create',
			title: 'Create',
			icon: <FilePlus2 size={16} />,
			iconRight: <ChevronRight size={14} />,
			items: [
				{
					key: 'create-folder',
					title: 'Folder',
					icon: <Folder size={16} />,
					onClick: async () => {
						const folderName = 'folder-' + nanoid(5)
						const folderAsset: AssetTreeFolderData = addAssetId({
							type: 'folder',
							name: folderName,
							path: path.join(state.project!.assetsDir, folderName),
							children: [],
						})

						const absPath = path.join(state.projectDir!, folderAsset.path)
						const { error } = await until(() => trpc.createFolder.mutate({ path: absPath }))
						if (error) {
							logger.error(
								`error creating folder at '${folderAsset.path}' (${getErrorLog(error)})`,
								error
							)
							// TODO show error toast
							return
						}

						state.assets.items.push(folderAsset)
						state.assets.items.sort()

						// enter folder rename mode immediately after creation
						startRename(folderAsset)
					},
				},
			],
		},
		{
			key: 'refresh',
			title: 'Refresh',
			icon: <RefreshCcw size={16} />,
			onClick: async () => {
				logger.info('refreshing assets')
			},
		},
	]

	// Reset focused index when search results change or search mode changes
	useEffect(() => {
		setFocusedIndex(-1)
	}, [searchResults, isSearchMode])

	// Handle keyboard navigation using Mantine's useWindowEvent hook
	useWindowEvent('keydown', (event) => {
		if (!isSearchMode) {
			return
		}

		if (event.key === 'Escape' && focusedIndex !== -1) {
			event.preventDefault()
			setFocusedIndex(-1)
			searchRef.current?.focus()
			return
		}

		if (!['ArrowUp', 'ArrowDown'].includes(event.key)) {
			return
		}

		event.preventDefault()

		setFocusedIndex((prevIndex) => {
			let newIndex = prevIndex

			if (event.key === 'ArrowDown') {
				newIndex = prevIndex < searchResults.length - 1 ? prevIndex + 1 : prevIndex
			} else if (event.key === 'ArrowUp') {
				newIndex = prevIndex > 0 ? prevIndex - 1 : prevIndex
			}

			// Select the focused item
			if (newIndex !== -1 && newIndex !== prevIndex) {
				const focusedItem = searchResults[newIndex]
				state.assets.selection = [focusedItem.id]
				state.assets.selectionChangedAt = Date.now()

				// Scroll the item into view
				const element = document.getElementById(`asset-item-${focusedItem.id}`)
				if (element) {
					element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
				}
			}

			return newIndex
		})
	})

	// Handle keyboard shortcuts
	useWindowEvent('keydown', (event) => {
		const activeElement = document.activeElement
		const isInputFocused =
			activeElement instanceof HTMLElement &&
			(activeElement.tagName === 'INPUT' ||
				activeElement.tagName === 'TEXTAREA' ||
				activeElement.isContentEditable)

		if (isInputFocused) {
			return
		}

		// Handle Ctrl/Command + F
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
			event.preventDefault()
			searchRef.current?.handleExpand()
		}
	})

	const handleSearchTabPress = () => {
		if (searchResults.length <= 0) {
			return
		}

		searchRef.current?.blur()

		setFocusedIndex(0)

		const firstItem = searchResults[0]
		state.assets.selection = [firstItem.id]
		state.assets.selectionChangedAt = Date.now()

		// Scroll the item into view
		const element = document.getElementById(`asset-item-${firstItem.id}`)
		if (element) {
			element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
		}
	}

	// Expose locateAsset through state
	useEffect(() => {
		state.assets.locateAsset = (assetId: string) => {
			// Get all parent folder IDs that need to be expanded
			const parentFoldersIds = getParentFolderIds(state.assets.items, assetId)

			// Expand all parent folders
			setOpenFolders((prev) => {
				const next = new Set(prev)
				parentFoldersIds.forEach((id) => next.add(id))
				return next
			})

			// Select the asset
			state.assets.selection = [assetId]
			state.assets.selectionChangedAt = Date.now()

			// Scroll the item into view
			setTimeout(() => {
				const element = document.getElementById(`asset-item-${assetId}`)
				if (element) {
					element.scrollIntoView({ block: 'center', behavior: 'instant' })
				}
			}, 100) // Small delay to ensure DOM is updated
		}

		return () => {
			state.assets.locateAsset = undefined
		}
	}, [])

	return (
		<ContextMenuProvider>
			<Paper style={{ height: '100%', display: 'flex', flexDirection: 'column' }} radius="sm">
				<Stack gap="xs" p="xs" style={{ height: '100%', minHeight: 0 }}>
					<Group justify="space-between" wrap="nowrap">
						{!isSearchMode && <PanelTitle title="Assets" />}
						<AssetsSearch
							ref={searchRef}
							flatAssets={allAssetsFlattened}
							onSearchChange={setSearchResults}
							onSearchModeChange={setIsSearchMode}
							onTabPress={handleSearchTabPress}
						/>
					</Group>
					<Divider />
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
								? searchResults.map((asset, index) => (
										<AssetTreeItem
											key={asset.path}
											item={asset}
											onToggle={toggleFolder}
											onSelect={handleSelect}
											onContextMenu={(event, clickedAsset) => {
												const contextMenuItems = getAssetContextMenuItems(clickedAsset)
												showContextMenu(contextMenuItems)(event)
											}}
											onRename={completeRename}
											renamedAssetId={itemToRename}
											isSelected={assetsSnap.selection.includes(asset.id)}
											isLastChild={false}
											isOpen={openFolders.has(asset.id)}
											openFolders={openFolders}
											id={getAssetItemId(asset.id)}
											isFocused={focusedIndex === index}
										/>
									))
								: assetsSnap.items.map((asset, index) => (
										<AssetTreeItem
											key={asset.path}
											id={getAssetItemId(asset.id)}
											item={asset}
											onToggle={toggleFolder}
											onSelect={handleSelect}
											onContextMenu={(event, clickedAsset) => {
												const contextMenuItems = getAssetContextMenuItems(clickedAsset)
												showContextMenu(contextMenuItems)(event)
											}}
											onRename={completeRename}
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
			</Paper>
		</ContextMenuProvider>
	)
}

/**
 * Creates the id (for the DOM element) of the asset item element
 */
export function getAssetItemId(assetId: string) {
	return `asset-item-${assetId}`
}
