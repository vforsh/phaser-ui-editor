import type { EditableComponentJson } from '../components/EditableComponent'
import type { PrefabImageAsset, PrefabSpritesheetFrameAsset } from '../prefabs/PrefabAsset'
import type { CreateEditableObjectJson } from './EditableObject'

export type EditableImageJson = CreateEditableObjectJson<{
	type: 'Image'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
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
