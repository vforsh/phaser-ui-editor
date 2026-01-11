import type { IPatchesConfig } from '@koreez/phaser3-ninepatch'

import type { EditableComponentJson } from '../components/EditableComponent'
import type { PrefabImageAsset, PrefabSpritesheetFrameAsset } from '../prefabs/PrefabAsset'
import type { CreateEditableObjectJson } from './EditableObject'

export type EditableNineSliceJson = CreateEditableObjectJson<{
	type: 'NineSlice'
	id: string
	asset: PrefabImageAsset | PrefabSpritesheetFrameAsset
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
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
