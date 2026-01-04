import { alpha, Box, Modal, ScrollArea, Stack, Text, TextInput, useMantineTheme } from '@mantine/core'
import { State, state, useSnapshot } from '@state/State'
import { Fzf } from 'fzf'
import { useEffect, useMemo, useRef } from 'react'

import { getAssetById, getAssetRelativePath } from '../../../types/assets'
import classes from './AssetPickerSelectMenu.module.css'
import { AssetPreview } from './AssetPreview'

interface AssetPickerSelectMenuProps {
	opened: boolean
	onClose: () => void
	assetIds: string[]
	onSelect: (assetId: string) => void
	search: string
	onSearchChange: (value: string) => void
	selectedAssetId: string | null
	title?: string
}

// TODO optimize this comp, fps drops by 5-6 when opening the menu
export function AssetPickerSelectMenu({
	opened,
	onClose,
	assetIds,
	onSelect,
	search,
	onSearchChange,
	selectedAssetId,
	title = 'Select Asset',
}: AssetPickerSelectMenuProps) {
	const theme = useMantineTheme()
	const assetsSnap = useSnapshot(state.assets.items)
	const searchInputRef = useRef<HTMLInputElement>(null)

	// Create a searchable array of assets with their paths
	const searchableAssets = useMemo(() => {
		return assetIds
			.map((id) => {
				const asset = getAssetById(assetsSnap as State['assets']['items'], id)
				if (!asset) return null
				return {
					id,
					searchStr: getAssetRelativePath(asset.path),
					asset,
				}
			})
			.filter((item): item is NonNullable<typeof item> => item !== null)
	}, [assetIds, assetsSnap])

	// Create FZF instance with searchable assets
	const fzf = useMemo(() => {
		return new Fzf(searchableAssets, {
			selector: (item) => item.searchStr,
		})
	}, [searchableAssets])

	// Get filtered and ranked results
	const filteredAssetIds = useMemo(() => {
		if (!search) return assetIds
		return fzf.find(search).map((result) => result.item.id)
	}, [search, fzf, assetIds])

	useEffect(() => {
		if (!opened) {
			// Clear search when modal closes
			onSearchChange('')
			return
		}

		// Focus input immediately when modal opens
		const timeoutId = setTimeout(() => {
			searchInputRef.current?.focus()
		}, 100)

		return () => clearTimeout(timeoutId)
	}, [opened, onSearchChange])

	return (
		<Modal opened={opened} onClose={onClose} title={title} size="lg" trapFocus>
			<Stack gap="md">
				<TextInput
					ref={searchInputRef}
					placeholder="Search assets..."
					value={search}
					onChange={(e) => onSearchChange(e.currentTarget.value)}
					autoFocus
				/>
				<ScrollArea h={400}>
					<Stack gap={4}>
						{filteredAssetIds.map((id) => {
							const asset = getAssetById(assetsSnap as State['assets']['items'], id)
							if (!asset) {
								return null
							}

							const isSelected = id === selectedAssetId

							return (
								<Box
									key={id}
									className={classes.assetItem}
									onClick={() => {
										onSelect(id)
										onClose()
									}}
									style={{
										backgroundColor: isSelected ? alpha(theme.colors.blue[9], 0.2) : undefined,
										opacity: isSelected ? 1 : undefined,
									}}
								>
									<div className={classes.assetPreview}>
										<AssetPreview asset={asset} />
									</div>
									<Text size="sm" className={classes.assetPath} c={isSelected ? 'white' : undefined}>
										{getAssetRelativePath(asset.path)}
									</Text>
								</Box>
							)
						})}
					</Stack>
				</ScrollArea>
			</Stack>
		</Modal>
	)
}
