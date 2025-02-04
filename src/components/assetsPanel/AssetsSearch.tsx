import { ActionIcon, Checkbox, Group, Menu, Stack, TextInput, useMantineTheme } from '@mantine/core'
import { Fzf } from 'fzf'
import { Search, Settings2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AssetTreeItemData, AssetTreeItemDataType } from '../../types/assets'

type SearchAssetType = AssetTreeItemDataType | 'all'

const ASSET_TYPES: { label: string; value: SearchAssetType }[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Image', value: 'image' },
	{ label: 'Spritesheet', value: 'spritesheet' },
	{ label: 'Spritesheet Frame', value: 'spritesheet-frame' },
	{ label: 'Bitmap Font', value: 'bitmap-font' },
	{ label: 'Web Font', value: 'web-font' },
	{ label: 'JSON', value: 'json' },
	{ label: 'XML', value: 'xml' },
	{ label: 'Prefab', value: 'prefab' },
]

const PERMANENTLY_EXCLUDED_TYPES = ['folder', 'spritesheet-folder'] as const satisfies AssetTreeItemDataType[]

interface AssetsSearchProps {
	flatAssets: AssetTreeItemData[]
	onSearchChange: (results: AssetTreeItemData[]) => void
	onSearchModeChange: (isSearchMode: boolean) => void
}

export function AssetsSearch({ onSearchChange, flatAssets, onSearchModeChange }: AssetsSearchProps) {
	const theme = useMantineTheme()
	const [isExpanded, setIsExpanded] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [settingsOpened, setSettingsOpened] = useState(false)
	const [selectedTypes, setSelectedTypes] = useState<Set<SearchAssetType>>(getAllAssetTypes())

	// Memoize filtered assets based on selected types
	const filteredAssets = useMemo(() => {
		const query = searchQuery.trim()
		if (query.length <= 1 || selectedTypes.size === 0) {
			return []
		}

		return selectedTypes.has('all')
			? flatAssets.filter((asset) => !PERMANENTLY_EXCLUDED_TYPES.includes(asset.type))
			: flatAssets.filter((asset) => selectedTypes.has(asset.type))
	}, [flatAssets, selectedTypes, searchQuery])

	// Memoize the fzf instance
	const fzfInstance = useMemo(() => {
		return new Fzf(filteredAssets, {
			selector: (item: AssetTreeItemData) => item.name,
			limit: 15,
		})
	}, [filteredAssets])

	// Memoize search results
	const searchResults = useMemo(() => {
		if (!searchQuery.trim() || !fzfInstance) {
			return []
		}

		const results = fzfInstance.find(searchQuery).map((result) => result.item)

		return results
	}, [fzfInstance, searchQuery])

	// Update search results when they change
	useEffect(() => {
		onSearchChange(searchResults)
	}, [searchResults, onSearchChange])

	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query)
	}, [])

	const handleExpand = () => {
		setIsExpanded(true)
		setSelectedTypes(getAllAssetTypes())
		onSearchModeChange(true)
	}

	const handleCollapse = () => {
		setIsExpanded(false)
		setSearchQuery('')
		onSearchChange([])
		onSearchModeChange(false)
	}

	const handleSettingsClick = () => {
		setSettingsOpened(true)
	}

	const handleSettingsClose = () => {
		setSettingsOpened(false)
	}

	const handleTypeToggle = (type: SearchAssetType) => {
		const newTypes = new Set(selectedTypes)

		if (type === 'all') {
			// If "All" is being checked, select all types
			if (!selectedTypes.has('all')) {
				ASSET_TYPES.forEach((t) => newTypes.add(t.value))
			} else {
				// If "All" is being unchecked, clear all types
				newTypes.clear()
			}
		} else {
			if (selectedTypes.has(type)) {
				newTypes.delete(type)
				newTypes.delete('all') // Remove "All" when any type is unchecked
			} else {
				newTypes.add(type)
				// If all individual types are selected, also select "All"
				const allTypesSelected = ASSET_TYPES.slice(1).every((t) => newTypes.has(t.value))
				if (allTypesSelected) {
					newTypes.add('all')
				}
			}
		}

		setSelectedTypes(newTypes)
	}

	return isExpanded ? (
		<Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
			<TextInput
				placeholder="Search assets..."
				value={searchQuery}
				onChange={(e) => handleSearchChange(e.target.value)}
				styles={{
					root: { flex: 1 },
				}}
				autoFocus
			/>
			<Menu opened={settingsOpened} onClose={handleSettingsClose} position="bottom-end" withArrow>
				<Menu.Target>
					{/* <Indicator disabled={selectedTypes.has('all')} color={theme.colors.blue[8]} size={6} offset={4} position="top-end" inline> */}
					<ActionIcon variant="subtle" size="sm" color={theme.colors.gray[5]} onClick={handleSettingsClick}>
						<Settings2 size={18} />
					</ActionIcon>
					{/* </Indicator> */}
				</Menu.Target>
				<Menu.Dropdown>
					<Menu.Label>Asset Type</Menu.Label>
					<Stack gap="xs" p="xs">
						{ASSET_TYPES.map((type) => (
							<Checkbox
								key={type.value}
								label={type.label}
								checked={selectedTypes.has(type.value)}
								onChange={() => handleTypeToggle(type.value)}
							/>
						))}
					</Stack>
				</Menu.Dropdown>
			</Menu>
			<ActionIcon variant="subtle" size="sm" color={theme.colors.gray[5]} onClick={handleCollapse}>
				<X size={18} />
			</ActionIcon>
		</Group>
	) : (
		<ActionIcon variant="subtle" onClick={handleExpand} size="sm" color={theme.colors.gray[5]}>
			<Search size={18} />
		</ActionIcon>
	)
}

function getAllAssetTypes() {
	return new Set(ASSET_TYPES.map((type) => type.value))
}
