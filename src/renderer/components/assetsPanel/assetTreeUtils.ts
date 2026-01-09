import { Snapshot } from 'valtio'

import { AssetTreeItemData, getAssetChildren } from '../../types/assets'

/**
 * Flattens the asset tree into a single-level array
 */
export const flattenAssets = (items: Snapshot<AssetTreeItemData>[]): Snapshot<AssetTreeItemData>[] => {
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
 * Determines if an asset is "openable" for search purposes.
 * Excludes containers (folder, spritesheet-folder) and virtual-path-only items (spritesheet-frame).
 */
export const isOpenableAssetForSearch = (asset: Snapshot<AssetTreeItemData>): boolean => {
	return !['folder', 'spritesheet-folder', 'spritesheet-frame'].includes(asset.type)
}
