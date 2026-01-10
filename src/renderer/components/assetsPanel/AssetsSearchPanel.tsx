import { Avatar, Badge, rem } from '@mantine/core'
import { Spotlight, spotlight } from '@mantine/spotlight'
import { state, useSnapshot } from '@state/State'
import { Fzf } from 'fzf'
import { Cuboid, File, FileJson, FileSpreadsheet, FileType, Image as ImageIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { match } from 'ts-pattern'
import { Snapshot } from 'valtio'

import { useAppCommands } from '../../di/DiHooks'
import {
	AssetTreeItemData,
	fetchImageUrl,
	fetchPrefabThumbnailUrl,
	getAssetRelativePath,
	GraphicAssetData,
	isGraphicAsset,
} from '../../types/assets'
import { flattenAssets, isOpenableAssetForSearch } from './assetTreeUtils'
import './AssetsSearchPanel.module.css'

const RESULT_LIMIT = 7
const SPOTLIGHT_TOP_OFFSET = '33vh'

/**
 * Hook to fetch preview thumbnails for assets (images/spritesheets/etc + prefabs).
 *
 * Important: `fetchImageUrl`/`fetchPrefabThumbnailUrl` return blob URLs, so we must
 * revoke them when they are replaced/removed to avoid leaking memory.
 */
function useAssetThumbnails(assets: Snapshot<AssetTreeItemData>[], prefabThumbnailUpdatedAt: Record<string, number>) {
	const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
	const thumbnailsRef = useRef<Record<string, string>>({})

	useEffect(() => {
		thumbnailsRef.current = thumbnails
	}, [thumbnails])

	const prefabThumbnailUpdatedAtToken = useMemo(() => {
		return assets
			.filter((asset) => asset.type === 'prefab')
			.map((prefab) => `${prefab.id}:${prefabThumbnailUpdatedAt[prefab.id] ?? 0}`)
			.join('|')
	}, [assets, prefabThumbnailUpdatedAt])

	useEffect(() => {
		const abortControllers = new Map<string, AbortController>()

		const validIds = new Set(assets.map((asset) => asset.id))

		// Drop thumbnails for assets that are no longer relevant and revoke their blob URLs.
		setThumbnails((prev) => {
			let next: Record<string, string> | null = null

			for (const [id, url] of Object.entries(prev)) {
				if (validIds.has(id)) {
					continue
				}

				next ??= { ...prev }
				delete next[id]
				URL.revokeObjectURL(url)
			}

			return next ?? prev
		})

		assets.forEach((asset) => {
			const ac = new AbortController()
			abortControllers.set(asset.id, ac)

			// Cast to mutable type for type guards.
			const mutableAsset = asset as AssetTreeItemData

			const fetchUrl = async () => {
				if (isGraphicAsset(mutableAsset)) {
					return fetchImageUrl(mutableAsset as GraphicAssetData, ac.signal)
				}

				if (mutableAsset.type === 'prefab') {
					return fetchPrefabThumbnailUrl(mutableAsset, ac.signal)
				}

				return null
			}

			fetchUrl()
				.then((url) => {
					if (!url) {
						// If we had a previous thumbnail for this asset, revoke it and remove it.
						setThumbnails((prev) => {
							const prevUrl = prev[asset.id]
							if (!prevUrl) {
								return prev
							}

							const next = { ...prev }
							delete next[asset.id]
							URL.revokeObjectURL(prevUrl)
							return next
						})

						return
					}

					setThumbnails((prev) => {
						const prevUrl = prev[asset.id]
						if (prevUrl === url) {
							return prev
						}

						if (prevUrl) {
							URL.revokeObjectURL(prevUrl)
						}

						return { ...prev, [asset.id]: url }
					})
				})
				.catch(() => {
					// Ignore abort errors
				})
		})

		return () => {
			abortControllers.forEach((ac) => ac.abort())
		}
	}, [assets, prefabThumbnailUpdatedAtToken])

	useEffect(() => {
		return () => {
			for (const url of Object.values(thumbnailsRef.current)) {
				URL.revokeObjectURL(url)
			}
		}
	}, [])

	return thumbnails
}

/**
 * Get icon for non-graphic assets
 */
function getAssetIcon(asset: Snapshot<AssetTreeItemData>) {
	return match(asset)
		.with({ type: 'prefab' }, () => <Cuboid size={16} />)
		.with({ type: 'file' }, () => <File size={16} />)
		.with({ type: 'json' }, () => <FileJson size={16} />)
		.with({ type: 'xml' }, () => <FileSpreadsheet size={16} />)
		.with({ type: 'web-font' }, () => <FileType size={16} />)
		.with({ type: 'spritesheet' }, () => <ImageIcon size={16} />)
		.otherwise(() => <File size={16} />)
}

export function AssetsSearchPanel() {
	const assetsSnap = useSnapshot(state.assets)
	const appCommands = useAppCommands()
	const [query, setQuery] = useState('')
	const [activeIndex, setActiveIndex] = useState(0)

	// Flatten and filter assets to "openable" only
	const openableAssets = useMemo(() => {
		const flattened = flattenAssets(assetsSnap.items as AssetTreeItemData[])
		return flattened.filter(isOpenableAssetForSearch)
	}, [assetsSnap.items])

	// Create fzf instance
	const fzfInstance = useMemo(() => {
		return new Fzf(openableAssets, {
			selector: (item: Snapshot<AssetTreeItemData>) => item.name,
			limit: RESULT_LIMIT,
		})
	}, [openableAssets])

	// Get search results
	const searchResults = useMemo(() => {
		const trimmedQuery = query.trim()
		if (!trimmedQuery) {
			return []
		}

		return fzfInstance.find(trimmedQuery).map((result) => result.item)
	}, [fzfInstance, query])

	// Fetch thumbnails for search results
	const thumbnails = useAssetThumbnails(searchResults, assetsSnap.prefabThumbnailUpdatedAt)

	// Reset active index when results change
	useEffect(() => {
		setActiveIndex(0)
	}, [searchResults])

	// Global keyboard listener for Ctrl+Shift+A (Windows/Linux) or Cmd+Shift+A (Mac)
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Guard: must be (Ctrl or Cmd) + Shift + A
			const isModifierPressed = event.ctrlKey || event.metaKey
			if (!isModifierPressed || !event.shiftKey || event.key.toLowerCase() !== 'a') {
				return
			}

			event.preventDefault()
			event.stopPropagation()
			spotlight.open()
		}

		// Use capture phase to ensure this runs before other handlers (including canvas)
		window.addEventListener('keydown', handleKeyDown, true)

		return () => {
			window.removeEventListener('keydown', handleKeyDown, true)
		}
	}, [])

	const handleActivation = (asset: Snapshot<AssetTreeItemData>, isCtrlEnter: boolean) => {
		// Update selection
		state.assets.selection = [asset.id]
		state.assets.selectionChangedAt = Date.now()

		// Try to reveal in Assets panel (guarded)
		if (state.assets.locateAsset) {
			state.assets.locateAsset(asset.id)
		} else if (state.assets.focusPanel) {
			state.assets.focusPanel()
		}

		// Handle Ctrl+Enter for prefabs
		if (isCtrlEnter && asset.type === 'prefab') {
			appCommands.emit('open-prefab', asset.id)
		}

		// Close spotlight
		spotlight.close()
	}

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		// Handle Enter key
		if (event.key === 'Enter') {
			const activeAsset = searchResults[activeIndex]
			if (!activeAsset) {
				return
			}

			event.preventDefault()
			handleActivation(activeAsset, event.ctrlKey || event.metaKey)
		}
	}

	return (
		<Spotlight
			query={query}
			onQueryChange={setQuery}
			searchProps={{
				placeholder: 'Search assets...',
				onKeyDown: handleKeyDown,
			}}
			shortcut={null}
			highlightQuery
			styles={{
				// Keep the spotlight anchored to the top so its Y position does not shift
				// when actions list height changes while typing.
				inner: {
					alignItems: 'flex-start',
					paddingTop: SPOTLIGHT_TOP_OFFSET,
				},
				content: {
					marginTop: 0,
				},
				action: {
					'borderRadius': 0,
					'&:hover': {
						backgroundColor: 'rgba(255, 255, 255, 0.08)',
					},
					'&[dataHovered]': {
						backgroundColor: 'rgba(255, 255, 255, 0.08)',
					},
				},
				actionsList: {
					padding: 0,
				},
				actionBody: {
					opacity: 1,
				},
			}}
			actions={searchResults.map((asset) => {
				const thumbnailUrl = thumbnails[asset.id]
				const isGraphic = isGraphicAsset(asset as AssetTreeItemData)
				const hasPreviewThumbnail = Boolean(thumbnailUrl) && (isGraphic || asset.type === 'prefab')
				const relativePath = getAssetRelativePath((asset as AssetTreeItemData).path)

				return {
					id: asset.id,
					label: asset.name,
					description: relativePath,
					onClick: () => handleActivation(asset, false),
					leftSection: hasPreviewThumbnail ? (
						<Avatar src={thumbnailUrl} size={40} radius="sm" />
					) : (
						<Avatar radius="sm" size={40}>
							{getAssetIcon(asset)}
						</Avatar>
					),
					rightSection: (
						<Badge variant="outline" size="sm" radius="xl" tt="none" color="dark">
							{asset.type}
						</Badge>
					),
				}
			})}
			onSpotlightClose={() => {
				setQuery('')
				setActiveIndex(0)
			}}
			nothingFound={query.trim() ? 'No assets found' : 'Type to search...'}
		/>
	)
}
