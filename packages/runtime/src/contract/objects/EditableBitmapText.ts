import type { EditableComponentJson } from '../components/EditableComponent'
import type { PrefabBitmapFontAsset } from '../prefabs/PrefabAsset'
import type { CreateEditableObjectJson } from './EditableObject'

export type EditableBitmapTextJson = CreateEditableObjectJson<{
	type: 'BitmapText'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
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
