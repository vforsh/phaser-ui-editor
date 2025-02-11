import { AssetTreeBitmapFontData, AssetTreeImageData, AssetTreeSpritesheetData, AssetTreeWebFontData } from '../assets'

/**
 * We actually only need the `id` property. The rest is for debugging & logging purposes.
 */
export type PrefabAsset = PrefabImageAsset | PrefabSpritesheetAsset | PrefabBitmapFontAsset | PrefabWebFontAsset

type BasePrefabAsset = {
	id: string
	name: string
}

export type PrefabImageAsset = BasePrefabAsset & {
	type: 'image'
}

export type PrefabSpritesheetAsset = BasePrefabAsset & {
	type: 'spritesheet'
}

export type PrefabBitmapFontAsset = BasePrefabAsset & {
	type: 'bitmap-font'
}

export type PrefabWebFontAsset = BasePrefabAsset & {
	type: 'web-font'
}

export function createPrefabAsset<T extends PrefabAsset>(
	asset: AssetTreeBitmapFontData | AssetTreeSpritesheetData | AssetTreeWebFontData | AssetTreeImageData
): T {
	return {
		id: asset.id,
		name: asset.name,
		type: asset.type,
	} as T
}
