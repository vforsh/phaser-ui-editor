import type { PrefabAsset, PrefabBitmapFontAsset, PrefabImageAsset, PrefabSpritesheetFrameAsset, PrefabWebFontAsset } from '@tekton/runtime'

import type { AssetTreeBitmapFontData, AssetTreeImageData, AssetTreeSpritesheetFrameData, AssetTreeWebFontData } from '../types/assets'

export type { PrefabAsset, PrefabBitmapFontAsset, PrefabImageAsset, PrefabSpritesheetFrameAsset, PrefabWebFontAsset } from '@tekton/runtime'

export function createPrefabAsset<T extends PrefabAsset>(
	asset: AssetTreeBitmapFontData | AssetTreeSpritesheetFrameData | AssetTreeWebFontData | AssetTreeImageData,
): T {
	return {
		id: asset.id,
		name: asset.name,
		type: asset.type,
	} as T
}
