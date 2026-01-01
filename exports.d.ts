import { IPatchesConfig } from '@koreez/phaser3-ninepatch'

type BasePrefabAsset = {
	id: string
	name: string
}
type PrefabImageAsset = BasePrefabAsset & {
	type: 'image'
}
type PrefabSpritesheetFrameAsset = BasePrefabAsset & {
	type: 'spritesheet-frame'
}
type PrefabBitmapFontAsset = BasePrefabAsset & {
	type: 'bitmap-font'
}
type PrefabWebFontAsset = BasePrefabAsset & {
	type: 'web-font'
}

type EditableBitmapTextJson = CreateEditableObjectJson<{
	type: 'BitmapText'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: {
		x: number
		y: number
	}
	originX: number
	originY: number
	locked: boolean
	text: string
	font: string
	fontSize: number
	align: number
	maxWidth: number
	letterSpacing: number
	lineSpacing: number
	tint: number
	tintFill: boolean
	angle: number
	width: number
	height: number
	displayWidth: number
	displayHeight: number
	components: EditableComponentJson[]
	asset: PrefabBitmapFontAsset
}>

type EditableImageJson = CreateEditableObjectJson<{
	type: 'Image'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: {
		x: number
		y: number
	}
	locked: boolean
	tint: number
	tintFill: boolean
	angle: number
	originX: number
	originY: number
	width: number
	height: number
	displayWidth: number
	displayHeight: number
	components: EditableComponentJson[]
	asset: PrefabImageAsset | PrefabSpritesheetFrameAsset
}>

type EditableNineSliceJson = CreateEditableObjectJson<{
	type: 'NineSlice'
	id: string
	asset: PrefabImageAsset | PrefabSpritesheetFrameAsset
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: {
		x: number
		y: number
	}
	originX: number
	originY: number
	locked: boolean
	tint: number
	tintFill: boolean
	width: number
	height: number
	displayWidth: number
	displayHeight: number
	ninePatchConfig: IPatchesConfig
	angle: number
	components: EditableComponentJson[]
}>

type EditableTextJson = CreateEditableObjectJson<{
	type: 'Text'
	id: string
	asset: PrefabWebFontAsset
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: {
		x: number
		y: number
	}
	originX: number
	originY: number
	locked: boolean
	text: string
	style: EditableTextStyleJson
	lineSpacing: number
	letterSpacing: number
	tint: number
	tintFill: boolean
	angle: number
	paddingX: number
	paddingY: number
	wordWrapWidth: number
	wordWrapUseAdvanced: boolean
	width: number
	height: number
	displayWidth: number
	displayHeight: number
	components: EditableComponentJson[]
}>
type EditableTextStyleJson = Partial<{
	fontFamily: string
	fontSize: string
	fontStyle: string
	backgroundColor: string | null
	color: string
	stroke: string
	strokeThickness: number
	shadowOffsetX: number
	shadowOffsetY: number
	shadowColor: string
	shadowBlur: number
	shadowStroke: boolean
	shadowFill: boolean
	align: string
	maxLines: number
	fixedWidth: number
	fixedHeight: number
	resolution: number
	rtl: boolean
	testString: string
	baselineX: number
	baselineY: number
	wordWrapWidth: number | null
	wordWrapUseAdvanced: boolean
	metrics: {
		ascent: number
		descent: number
		fontSize: number
	}
}>

type CreateEditableObjectJson<
	T extends {
		readonly type: string
		locked: boolean
		components: EditableComponentJson[]
	},
> = Phaser.Types.GameObjects.JSONGameObject & T
type EditableObjectJson =
	| EditableContainerJson
	| EditableImageJson
	| EditableNineSliceJson
	| EditableTextJson
	| EditableBitmapTextJson

type PrefabRef = {
	id: string
	name: string
}
type EditableContainerJson = CreateEditableObjectJson<{
	type: 'Container'
	id: string
	children: EditableObjectJson[]
	name: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: {
		x: number
		y: number
	}
	locked: boolean
	angle: number
	originX: number
	originY: number
	width: number
	height: number
	displayWidth: number
	displayHeight: number
	components: EditableComponentJson[]
	/**
	 * If the container was created from a prefab, this will be the reference to the prefab.
	 */
	prefab: PrefabRef | null
}>

declare const PHASER_ALIGN: {
	readonly 'top-left': number
	readonly 'top-center': number
	readonly 'top-right': number
	readonly 'left-center': number
	readonly 'center': number
	readonly 'right-center': number
	readonly 'bottom-left': number
	readonly 'bottom-center': number
	readonly 'bottom-right': number
}
type PhaserAlignKey = keyof typeof PHASER_ALIGN

type GridLayoutComponentJson = {
	type: 'grid-layout'
	id: string
	active: boolean
	columns: number
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingX: number
	spacingY: number
	centerLastRow: boolean
}

type HorizontalLayoutComponentJson = {
	type: 'horizontal-layout'
	id: string
	active: boolean
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingX: number
}

type VerticalLayoutComponentJson = {
	type: 'vertical-layout'
	id: string
	active: boolean
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingY: number
}

type EditableComponentJson = HorizontalLayoutComponentJson | VerticalLayoutComponentJson | GridLayoutComponentJson

type PrefabFile = {
	content: EditableContainerJson | null
	/**
	 * Used in the runtime to load the assets before displaying the prefab.
	 */
	assetPack: Phaser.Types.Loader.FileTypes.PackFileSection[]
}

export type {
	EditableBitmapTextJson,
	EditableComponentJson,
	EditableContainerJson,
	EditableImageJson,
	EditableNineSliceJson,
	EditableObjectJson,
	EditableTextJson,
	GridLayoutComponentJson,
	HorizontalLayoutComponentJson,
	PrefabFile,
	VerticalLayoutComponentJson,
}
