import { AssetTreeBitmapFontData, AssetTreeImageData, AssetTreeSpritesheetFrameData, AssetTreeWebFontData } from '../assets'

/**
 * We actually only need the `id` property. The rest is for debugging & logging purposes.
 */
export type PrefabAsset = PrefabImageAsset | PrefabSpritesheetFrameAsset | PrefabBitmapFontAsset | PrefabWebFontAsset

type BasePrefabAsset = {
	id: string
	name: string
}

export type PrefabImageAsset = BasePrefabAsset & {
	type: 'image'
}

export type PrefabSpritesheetFrameAsset = BasePrefabAsset & {
	type: 'spritesheet-frame'
}

export type PrefabBitmapFontAsset = BasePrefabAsset & {
	type: 'bitmap-font'
}

export type PrefabWebFontAsset = BasePrefabAsset & {
	type: 'web-font'
}

export function createPrefabAsset<T extends PrefabAsset>(
	asset: AssetTreeBitmapFontData | AssetTreeSpritesheetFrameData | AssetTreeWebFontData | AssetTreeImageData,
): T {
	return {
		id: asset.id,
		name: asset.name,
		type: asset.type,
	} as T
}
