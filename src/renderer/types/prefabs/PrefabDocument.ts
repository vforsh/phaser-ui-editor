import type { IPatchesConfig } from '@koreez/phaser3-ninepatch'

import type { EditableBitmapTextJson } from '../../components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import type { EditableContainerJson, PrefabRef } from '../../components/canvas/phaser/scenes/main/objects/EditableContainer'
import type {
	EditableGraphicsJson,
	GraphicsFillJson,
	GraphicsShapeJson,
	GraphicsStrokeJson,
} from '../../components/canvas/phaser/scenes/main/objects/EditableGraphics'
import type { EditableImageJson } from '../../components/canvas/phaser/scenes/main/objects/EditableImage'
import type { EditableNineSliceJson } from '../../components/canvas/phaser/scenes/main/objects/EditableNineSlice'
import type { EditableTextJson, EditableTextStyleJson } from '../../components/canvas/phaser/scenes/main/objects/EditableText'

export type NodeAddressSegment = { kind: 'local'; localId: string } | { kind: 'nestedPrefab'; prefabId: string }

export type NodeAddress = NodeAddressSegment[]

export type PrefabObjectPatch = {
	name?: string
	visible?: boolean
	locked?: boolean
	x?: number
	y?: number
	angle?: number
	scale?: { x: number; y: number }
	alpha?: number
	originX?: number
	originY?: number
	width?: number
	height?: number
	depth?: number
	blendMode?: string | Phaser.BlendModes | number
	displayWidth?: number
	displayHeight?: number
	// image
	tint?: number
	tintFill?: boolean
	textureKey?: string
	frameKey?: string | number
	// text
	text?: string
	style?: EditableTextStyleJson
	// bitmap text
	font?: string
	fontSize?: number
	align?: number
	maxWidth?: number
	// nine-slice
	ninePatchConfig?: IPatchesConfig
	// graphics
	shape?: GraphicsShapeJson
	fill?: GraphicsFillJson
	stroke?: GraphicsStrokeJson
}

export type PrefabObjectOverride = {
	target: NodeAddress
	patch: PrefabObjectPatch
}

export type PrefabComponentOverride = {
	target: NodeAddress
	componentId: string
	patch: Record<string, unknown>
}

export type PrefabOverrides = {
	objects: PrefabObjectOverride[]
	components: PrefabComponentOverride[]
}

export function createEmptyPrefabOverrides(): PrefabOverrides {
	return { objects: [], components: [] }
}

export type PrefabInstanceJson = {
	type: 'PrefabInstance'
	localId?: string
	prefabRef: PrefabRef
	overrides: PrefabOverrides
	name: string
	visible: boolean
	locked: boolean
	x: number
	y: number
	angle: number
	scale: { x: number; y: number }
	alpha: number
	originX: number
	originY: number
	width: number
	height: number
	depth: number
	blendMode: string | Phaser.BlendModes | number
	displayWidth: number
	displayHeight: number
}

export type CanvasDocumentContainerJson = Omit<EditableContainerJson, 'children'> & {
	children: CanvasDocumentNodeJson[]
}

export type CanvasDocumentNodeJson =
	| CanvasDocumentContainerJson
	| EditableImageJson
	| EditableNineSliceJson
	| EditableTextJson
	| EditableBitmapTextJson
	| EditableGraphicsJson
	| PrefabInstanceJson

export type CanvasDocumentJson = CanvasDocumentContainerJson

export function isPrefabInstanceJson(node: CanvasDocumentNodeJson): node is PrefabInstanceJson {
	return node.type === 'PrefabInstance'
}
