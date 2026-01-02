import { Divider, Group, Paper, ScrollArea, Stack } from '@mantine/core'
import { useWindowEvent } from '@mantine/hooks'
import { until } from '@open-draft/until'
import { state, useSnapshot } from '@state/State'
import { getErrorLog } from '@utils/error/utils'
import { cloneDeep } from 'es-toolkit'
import {
	ChevronRight,
	ClipboardCopy,
	ClipboardPaste,
	Copy,
	Cuboid,
	ExternalLink,
	FileJson,
	FilePlus2,
	Folder,
	FolderOpen,
	Image,
	RefreshCcw,
	Scissors,
	TextCursorInput,
	Trash2,
} from 'lucide-react'
import { ContextMenuItemOptions, useContextMenu } from 'mantine-contextmenu'
import { nanoid } from 'nanoid'
import path from 'path-browserify-esm'
import { useEffect, useMemo, useRef, useState } from 'react'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { Snapshot } from 'valtio'
import { backend } from '../../backend-renderer/backend'
import {
	AssetTreeFolderData,
	AssetTreePrefabData,
	getAssetById,
	getAssetChildren,
	getParentAsset,
	isAssetOfType,
	removeAssetById,
	type AssetTreeItemData,
} from '../../types/assets'
import { createEmptyPrefabFile } from '../../types/prefabs/PrefabFile'
import { PanelTitle } from './../PanelTitle'
import styles from './AssetsPanel.module.css'
import { AssetsSearch } from './AssetsSearch'
import AssetTreeItem from './AssetTreeItem'
import { addAssetId } from './build-asset-tree'
import { useAppCommands } from '../../di/DiContext'

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

/**
 * Determines if an asset can be renamed based on its type
 */
const canAssetBeRenamed = (asset: Snapshot<AssetTreeItemData> | AssetTreeItemData): boolean => {
	return match(asset.type)
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

/**
 * Returns a list of items that are currently visible in the tree view
 * taking into account the open/closed state of folders
 */
const getVisibleItems = (
	items: Snapshot<AssetTreeItemData>[],
	openFolders: Set<string>
): Snapshot<AssetTreeItemData>[] => {
	const result: Snapshot<AssetTreeItemData>[] = []

	const traverse = (items: Snapshot<AssetTreeItemData>[], parentIsVisible: boolean) => {
		items.forEach((item) => {
			if (!parentIsVisible) return

			result.push(item)

			const children = getAssetChildren(item as AssetTreeItemData)
			if (children) {
				traverse(children, openFolders.has(item.id))
			}
		})
	}

	traverse(items, true)
	return result
}

export default function AssetsPanel({ logger }: AssetsPanelProps) {
	const assetsSnap = useSnapshot(state.assets)
	const { showContextMenu } = useContextMenu()
	const appCommands = useAppCommands()
	const [itemToRename, setItemToRename] = useState<string | null>(null)
	const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
	const [searchResults, setSearchResults] = useState<Snapshot<AssetTreeItemData>[]>([])
	const [isSearchMode, setIsSearchMode] = useState(false)
	const [focusedIndex, setFocusedIndex] = useState<number>(-1)
	const searchRef = useRef<{ handleExpand: () => void; blur: () => void; focus: () => void } | null>(null)

	const panelRef = useRef<HTMLDivElement>(null)
	const scrollAreaRef = useRef<HTMLDivElement>(null)
	const [isFocused, setIsFocused] = useState(document.activeElement === panelRef.current)

	// Memoize flattened items for better search performance
	const allAssetsFlattened = useMemo(() => flattenAssets(assetsSnap.items as AssetTreeItemData[]), [assetsSnap.items])

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

	const openPrefab = (prefabAssetId: string) => {
		// TODO check if currently edited prefab has no unsaved changes
		// - if there are unsaved changes, show a confirmation dialog
		// - if confirmed, save and then open the selected prefab
		// - if cancelled, do nothing

		appCommands.emit('open-prefab', prefabAssetId)
	}

	const handleDoubleClick = (item: Snapshot<AssetTreeItemData>) => {
		if (item.type === 'prefab') {
			openPrefab(item.id)
		} else if (getAssetChildren(item as AssetTreeItemData)) {
			// Toggle folder open/closed state
			toggleFolder(item.id)
		}
	}

	const getAssetContextMenuItems = (asset: Snapshot<AssetTreeItemData>) => {
		const canBeRenamed = canAssetBeRenamed(asset)
		const canBeDuplicated = canBeRenamed && asset.type !== 'folder'

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

							const { error } = await until(() => backend.createFolder({ path: folderAsset.path }))
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

							// TODO prefabs: suggest a name for the prefab
							const prefabNameTemp = `prefab-${nanoid(5)}.prefab`
							const prefabAsset: AssetTreePrefabData = addAssetId({
								type: 'prefab',
								name: prefabNameTemp,
								path: path.join(folderAsset.path, prefabNameTemp),
							})

							logger.info(`creating prefab at '${prefabAsset.path}'`)

							const { error } = await until(() =>
								backend.createTextFile({
									path: prefabAsset.path,
									content: JSON.stringify(createEmptyPrefabFile()),
								})
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
			{ key: 'divider-1' },
			{
				key: 'open',
				title: 'Open',
				icon: asset.type === 'folder' ? <FolderOpen size={16} /> : <FileJson size={16} />,
				onClick: async () => {
					await backend.open({ path: asset.path })
				},
			},
			{
				key: 'openInFiles',
				title: 'Open in Files',
				icon: <ExternalLink size={16} />,
				onClick: async () => {
					const pathToOpen = path.dirname(asset.path)
					await backend.open({ path: pathToOpen })
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
									await backend.open({ path: asset.project })
								}
							},
						},
					]
				: []),
			{ key: 'divider-2' },
			{
				key: 'copy',
				title: 'Copy',
				icon: <ClipboardCopy size={16} />,
				onClick: async () => {
					// TODO implement asset copy
					console.log(`copying asset '${asset.name}'`)
				},
			},
			{
				key: 'duplicate',
				title: 'Duplicate',
				icon: <Copy size={16} />,
				disabled: !canBeDuplicated,
				onClick: async () => {
					const parentAsset = getParentAsset(state.assets.items, asset.id)
					if (!parentAsset) {
						return
					}

					const { error, data } = await until(() => backend.duplicate({ path: asset.path }))
					if (error) {
						logger.error(`error duplicating asset '${asset.name}' (${getErrorLog(error)})`, error)
						// TODO show error toast
						return
					}

					const duplicatedAssetName = path.basename(data?.path)

					const duplicatedAsset = addAssetId({
						...cloneDeep(asset),
						name: duplicatedAssetName,
						path: data?.path,
					})

					match(parentAsset)
						.with({ type: 'folder' }, (folder) => {
							folder.children.push(duplicatedAsset)
							folder.children.sort()
						})
						.otherwise((parentAsset) => {
							console.error(`unknown parent asset type '${parentAsset.type}'`, parentAsset)
						})

					console.log(`duplicated asset '${duplicatedAsset.name}'`, duplicatedAsset)
				},
			},
			{
				key: 'cut',
				title: 'Cut',
				icon: <Scissors size={16} />,
				onClick: async () => {
					// TODO implement asset cut
					console.log(`cutting asset '${asset.name}'`)
				},
			},
			{
				key: 'paste',
				title: 'Paste',
				icon: <ClipboardPaste size={16} />,
				onClick: async () => {
					// TODO implement asset paste
					console.log(`pasting asset '${asset.name}'`)
				},
			},
			{ key: 'divider-3' },
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
						const { error } = await until(() => backend.trash({ path: absPath }))
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

		const { error } = await until(() => backend.rename({ oldPath, newPath }))
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
						const { error } = await until(() => backend.createFolder({ path: absPath }))
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
		// TODO CTRL+F should be handled int the EditorLayout component
		// Handle Ctrl/Command + F
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
			event.preventDefault()
			searchRef.current?.handleExpand()
		}

		if (!isFocused) {
			return
		}

		// Handle F2 for renaming selected asset
		if (event.key === 'F2') {
			event.preventDefault()

			// Get the selected asset
			if (assetsSnap.selection.length === 1) {
				const selectedAssetId = assetsSnap.selection[0]
				const selectedAsset = allAssetsFlattened.find((asset) => asset.id === selectedAssetId)

				if (selectedAsset && canAssetBeRenamed(selectedAsset)) {
					startRename(selectedAsset)
				}
			}
		}

		if (event.key === 'Enter') {
			event.preventDefault()

			const selectedAssetId = assetsSnap.selection[0]
			const selectedAsset = allAssetsFlattened.find((asset) => asset.id === selectedAssetId)
			if (selectedAsset && selectedAsset.type === 'prefab') {
				openPrefab(selectedAsset.id)
			}
		}

		// Handle arrow keys for navigation
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
			event.preventDefault()

			// If in search mode, don't handle navigation
			if (isSearchMode) {
				return
			}

			const visibleItems = getVisibleItems(assetsSnap.items as AssetTreeItemData[], openFolders)
			const currentSelection = assetsSnap.selection[0]

			if (!currentSelection) {
				// If nothing is selected, select the first item
				if (visibleItems.length > 0) {
					const firstItem = visibleItems[0]
					state.assets.selection = [firstItem.id]
					state.assets.selectionChangedAt = Date.now()
					scrollItemIntoView(firstItem.id)
				}
				return
			}

			const currentIndex = visibleItems.findIndex((asset) => asset.id === currentSelection)
			if (currentIndex === -1) return

			const currentItem = visibleItems[currentIndex]

			if (event.key === 'ArrowUp') {
				// Move selection up
				if (currentIndex > 0) {
					const prevItem = visibleItems[currentIndex - 1]
					state.assets.selection = [prevItem.id]
					state.assets.selectionChangedAt = Date.now()
					scrollItemIntoView(prevItem.id)
				}
			} else if (event.key === 'ArrowDown') {
				// Move selection down
				if (currentIndex < visibleItems.length - 1) {
					const nextItem = visibleItems[currentIndex + 1]
					state.assets.selection = [nextItem.id]
					state.assets.selectionChangedAt = Date.now()
					scrollItemIntoView(nextItem.id)
				}
			} else if (event.key === 'ArrowRight') {
				// Expand folder if it's a folder and it's collapsed
				if ('children' in currentItem || 'frames' in currentItem) {
					if (!openFolders.has(currentItem.id)) {
						toggleFolder(currentItem.id)
					}
				}
			} else if (event.key === 'ArrowLeft') {
				// If folder is expanded, collapse it
				if (('children' in currentItem || 'frames' in currentItem) && openFolders.has(currentItem.id)) {
					toggleFolder(currentItem.id)
				}
				// If it's not a folder or it's already collapsed, move to parent
				else {
					const parentFolder = getParentFolder(currentItem, allAssetsFlattened)
					if (parentFolder) {
						state.assets.selection = [parentFolder.id]
						state.assets.selectionChangedAt = Date.now()
						scrollItemIntoView(parentFolder.id)
					}
				}
			}
		}
	})

	const scrollItemIntoView = (itemId: string) => {
		const element = document.getElementById(`asset-item-${itemId}`)
		if (element) {
			element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
		}
	}

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
		<Paper
			className={styles.panel}
			radius="sm"
			ref={panelRef}
			onClick={() => panelRef.current?.focus()}
			tabIndex={2}
			onFocus={() => setIsFocused(true)}
			onBlur={() => setIsFocused(false)}
		>
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
					viewportRef={scrollAreaRef}
					onClick={(e) => {
						if (e.target === scrollAreaRef.current) {
							// TODO clear assets selection
						}
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
										onDoubleClick={handleDoubleClick}
										onContextMenu={(event, clickedAsset) => {
											const contextMenuItems = getAssetContextMenuItems(clickedAsset)
											showContextMenu(contextMenuItems)(event)
										}}
										onRenameSubmit={completeRename}
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
										onDoubleClick={handleDoubleClick}
										onContextMenu={(event, clickedAsset) => {
											const contextMenuItems = getAssetContextMenuItems(clickedAsset)
											showContextMenu(contextMenuItems, { style: { width: '200px' } })(event)
										}}
										onRenameSubmit={completeRename}
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
	)
}

/**
 * Creates the id (for the DOM element) of the asset item element
 */
export function getAssetItemId(assetId: string) {
	return `asset-item-${assetId}`
}
