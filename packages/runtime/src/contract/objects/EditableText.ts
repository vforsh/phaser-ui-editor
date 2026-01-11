import type { EditableComponentJson } from '../components/EditableComponent'
import type { PrefabWebFontAsset } from '../prefabs/PrefabAsset'
import type { CreateEditableObjectJson } from './EditableObject'

export type EditableTextJson = CreateEditableObjectJson<{
	type: 'Text'
	id: string
	asset: PrefabWebFontAsset
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
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

export type EditableTextStyleJson = Partial<{
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
