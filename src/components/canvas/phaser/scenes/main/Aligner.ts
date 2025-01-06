import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { TypedEventEmitter } from '../../robowhale/phaser3/TypedEventEmitter'
import { EditContext } from './editContext/EditContext'
import { calculateBounds } from './editContext/Transformable'
import { MainScene } from './MainScene'
import { EditableObject } from './objects/EditableObject'

const ALIGN_TYPES = [
	'top',
	'vertical-center',
	'bottom',
	'distribute-vertical',
	'left',
	'horizontal-center',
	'right',
	'distribute-horizontal',
] as const

export type AlignType = (typeof ALIGN_TYPES)[number]

type Events = {
	// align: (alignment: Alignment) => void
}

export type AlignerOptions = {
	scene: MainScene
	logger: Logger<{}>
}

export class Aligner extends TypedEventEmitter<Events> {
	private options: AlignerOptions
	private scene: MainScene
	public logger: Logger<{}>

	constructor(options: AlignerOptions) {
		super()

		this.options = options
		this.scene = options.scene
		this.logger = options.logger
	}

	public align(type: AlignType, objs: EditableObject[], context: EditContext): boolean {
		const contextBounds = this.getContextBounds(context)

		const isOne = objs.length === 1

		return match(type)
			.with('top', () => {
				const top = isOne ? contextBounds.top : calculateBounds(objs).top

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.top - obj.y
					obj.y = top - offset
				})

				return true
			})
			.with('vertical-center', () => {
				const center = isOne ? contextBounds.centerY : calculateBounds(objs).centerY

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.centerY - obj.y
					obj.y = center - offset
				})

				return true
			})
			.with('bottom', () => {
				const bottom = isOne ? contextBounds.bottom : calculateBounds(objs).bottom

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.bottom - obj.y
					obj.y = bottom - offset
				})

				return true
			})
			.with('distribute-vertical', () => {
				if (isOne) {
					return false
				}

				// Sort objects by their visual centers
				const sortedObjs = [...objs].sort((a, b) => {
					const aCenterY = a.y + a.displayHeight * (0.5 - a.originY)
					const bCenterY = b.y + b.displayHeight * (0.5 - b.originY)
					return aCenterY - bCenterY
				})

				// Get topmost and bottommost object centers
				const firstObj = sortedObjs[0]
				const lastObj = sortedObjs[sortedObjs.length - 1]

				const firstCenter = firstObj.y + firstObj.displayHeight * (0.5 - firstObj.originY)
				const lastCenter = lastObj.y + lastObj.displayHeight * (0.5 - lastObj.originY)

				const totalHeight = lastCenter - firstCenter
				const spacing = totalHeight / (objs.length - 1)

				// distribute CENTERS of objects vertically
				sortedObjs.forEach((obj, index) => {
					const centerY = firstCenter + spacing * index
					obj.y = centerY - obj.displayHeight * (0.5 - obj.originY)
				})

				return true
			})
			.with('left', () => {
				const left = isOne ? contextBounds.left : calculateBounds(objs).left

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.left - obj.x
					obj.x = left - offset
				})

				return true
			})
			.with('horizontal-center', () => {
				const center = isOne ? contextBounds.centerX : calculateBounds(objs).centerX

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.centerX - obj.x
					obj.x = center - offset
				})

				return true
			})
			.with('right', () => {
				const right = isOne ? contextBounds.right : calculateBounds(objs).right

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.right - obj.x
					obj.x = right - offset
				})

				return true
			})
			.with('distribute-horizontal', () => {
				if (isOne) {
					return false
				}

				// Sort objects by their visual centers
				const sortedObjs = [...objs].sort((a, b) => {
					const aCenterX = a.x + a.displayWidth * (0.5 - a.originX)
					const bCenterX = b.x + b.displayWidth * (0.5 - b.originX)
					return aCenterX - bCenterX
				})

				// Get leftmost and rightmost object centers
				const firstObj = sortedObjs[0]
				const lastObj = sortedObjs[sortedObjs.length - 1]

				const firstCenter = firstObj.x + firstObj.displayWidth * (0.5 - firstObj.originX)
				const lastCenter = lastObj.x + lastObj.displayWidth * (0.5 - lastObj.originX)

				const totalWidth = lastCenter - firstCenter
				const spacing = totalWidth / (objs.length - 1)

				// distribute CENTERS of objects horizontally
				sortedObjs.forEach((obj, index) => {
					const centerX = firstCenter + spacing * index
					obj.x = centerX - obj.displayWidth * (0.5 - obj.originX)
				})

				return true
			})
			.exhaustive()
	}

	private getContextBounds(context: EditContext): Phaser.Geom.Rectangle {
		if (context.isRoot) {
			const projectFrame = this.scene.projectSizeFrame!
			return new Phaser.Geom.Rectangle(0, 0, projectFrame.width, projectFrame.height)
		}

		return calculateBounds(context.target.editables)
	}

	private getRotatedBounds(obj: EditableObject) {
		const width = obj.displayWidth
		const height = obj.displayHeight
		const rotation = obj.rotation // in radians

		// Calculate the corners of the rectangle
		const cos = Math.cos(rotation)
		const sin = Math.sin(rotation)

		// Calculate relative corners (relative to object's position)
		const dx = width * (0.5 - obj.originX)
		const dy = height * (0.5 - obj.originY)

		const corners = [
			{ x: -width * obj.originX, y: -height * obj.originY },
			{ x: width * (1 - obj.originX), y: -height * obj.originY },
			{ x: width * (1 - obj.originX), y: height * (1 - obj.originY) },
			{ x: -width * obj.originX, y: height * (1 - obj.originY) },
		].map((point) => ({
			x: obj.x + (point.x * cos - point.y * sin),
			y: obj.y + (point.x * sin + point.y * cos),
		}))

		// Find the bounds
		const xs = corners.map((c) => c.x)
		const ys = corners.map((c) => c.y)

		return {
			top: Math.min(...ys),
			bottom: Math.max(...ys),
			left: Math.min(...xs),
			right: Math.max(...xs),
			centerX: obj.x + dx * cos - dy * sin,
			centerY: obj.y + dx * sin + dy * cos,
		}
	}
}
