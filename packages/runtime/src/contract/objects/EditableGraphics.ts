import type { EditableComponentJson } from '../components/EditableComponent'
import type { CreateEditableObjectJson } from './EditableObject'

type CornerRadiusAdvanced = {
	tl: number
	tr: number
	br: number
	bl: number
}

type CornerRadius = {
	mode: 'simple' | 'advanced'
	simple: number
	advanced: CornerRadiusAdvanced
}

export type GraphicsShapeJson =
	| {
			type: 'rectangle'
			cornerRadius: CornerRadius
	  }
	| {
			type: 'ellipse'
	  }

export type GraphicsFillJson = {
	enabled: boolean
	color: number
	alpha: number
}

export type GraphicsStrokeJson = {
	enabled: boolean
	color: number
	alpha: number
	width: number
	lineJoin: 'miter' | 'bevel' | 'round'
	lineCap: 'butt' | 'square' | 'round'
	miterLimit: number
}

export type EditableGraphicsJson = CreateEditableObjectJson<{
	type: 'Graphics'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	originX: number
	originY: number
	locked: boolean
	width: number
	height: number
	displayWidth: number
	displayHeight: number
	shape: GraphicsShapeJson
	fill: GraphicsFillJson
	stroke: GraphicsStrokeJson
	angle: number
	components: EditableComponentJson[]
}>
