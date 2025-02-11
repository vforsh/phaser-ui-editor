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
