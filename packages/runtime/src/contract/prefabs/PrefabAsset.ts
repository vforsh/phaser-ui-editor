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
