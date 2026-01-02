import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { TypedEventEmitter } from '../../robowhale/phaser3/TypedEventEmitter'
import { EditContext } from './editContext/EditContext'
import { getContainerBoxWorldBounds } from './editContext/object-bounds'
import { calculateBounds } from './editContext/Transformable'
import { MainScene } from './MainScene'
import { EditableObject } from './objects/EditableObject'
import { isPositionLockedForRuntimeObject } from './objects/editing/editRestrictions'

export type AlignType =
	| 'top'
	| 'vertical-center'
	| 'bottom'
	| 'distribute-vertical'
	| 'left'
	| 'horizontal-center'
	| 'right'
	| 'distribute-horizontal'

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
		if (objs.some((obj) => isPositionLockedForRuntimeObject(obj))) {
			return false
		}

		const contextBounds = this.getContextBounds(context)

		const isOne = objs.length === 1

		return match(type)
			.with('top', () => {
				const top = isOne ? contextBounds.top : calculateBounds(objs).top

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.top - obj.y
					obj.setY(top - offset)
				})

				return true
			})
			.with('vertical-center', () => {
				const center = isOne ? contextBounds.centerY : calculateBounds(objs).centerY

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.centerY - obj.y
					obj.setY(center - offset)
				})

				return true
			})
			.with('bottom', () => {
				const bottom = isOne ? contextBounds.bottom : calculateBounds(objs).bottom

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.bottom - obj.y
					obj.setY(bottom - offset)
				})

				return true
			})
			.with('distribute-vertical', () => {
				if (isOne) {
					return false
				}

				// Sort objects by their visual centers
				const sortedObjs = [...objs].sort((a, b) => {
					const aCenterY = a.y + a.displayHeight * (0.5 - this.getOriginY(a))
					const bCenterY = b.y + b.displayHeight * (0.5 - this.getOriginY(b))
					return aCenterY - bCenterY
				})

				// Get topmost and bottommost object centers
				const firstObj = sortedObjs[0]
				const lastObj = sortedObjs[sortedObjs.length - 1]

				const firstCenter = firstObj.y + firstObj.displayHeight * (0.5 - this.getOriginY(firstObj))
				const lastCenter = lastObj.y + lastObj.displayHeight * (0.5 - this.getOriginY(lastObj))

				const totalHeight = lastCenter - firstCenter
				const spacing = totalHeight / (objs.length - 1)

				// distribute CENTERS of objects vertically
				sortedObjs.forEach((obj, index) => {
					const centerY = firstCenter + spacing * index
					const newY = centerY - obj.displayHeight * (0.5 - this.getOriginY(obj))
					obj.setY(newY)
				})

				return true
			})
			.with('left', () => {
				const left = isOne ? contextBounds.left : calculateBounds(objs).left

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.left - obj.x
					obj.setX(left - offset)
				})

				return true
			})
			.with('horizontal-center', () => {
				const center = isOne ? contextBounds.centerX : calculateBounds(objs).centerX

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.centerX - obj.x
					obj.setX(center - offset)
				})

				return true
			})
			.with('right', () => {
				const right = isOne ? contextBounds.right : calculateBounds(objs).right

				objs.forEach((obj) => {
					const bounds = this.getRotatedBounds(obj)
					const offset = bounds.right - obj.x
					obj.setX(right - offset)
				})

				return true
			})
			.with('distribute-horizontal', () => {
				if (isOne) {
					return false
				}

				// Sort objects by their visual centers
				const sortedObjs = [...objs].sort((a, b) => {
					const aCenterX = a.x + a.displayWidth * (0.5 - this.getOriginX(a))
					const bCenterX = b.x + b.displayWidth * (0.5 - this.getOriginX(b))
					return aCenterX - bCenterX
				})

				// Get leftmost and rightmost object centers
				const firstObj = sortedObjs[0]
				const lastObj = sortedObjs[sortedObjs.length - 1]

				const firstCenter = firstObj.x + firstObj.displayWidth * (0.5 - this.getOriginX(firstObj))
				const lastCenter = lastObj.x + lastObj.displayWidth * (0.5 - this.getOriginX(lastObj))

				const totalWidth = lastCenter - firstCenter
				const spacing = totalWidth / (objs.length - 1)

				// distribute CENTERS of objects horizontally
				sortedObjs.forEach((obj, index) => {
					const centerX = firstCenter + spacing * index
					const newX = centerX - obj.displayWidth * (0.5 - this.getOriginX(obj))
					obj.setX(newX)
				})

				return true
			})
			.exhaustive()
	}

	private getContextBounds(context: EditContext): Phaser.Geom.Rectangle {
		const target = context.target
		const originX = this.getOriginX(target)
		const originY = this.getOriginY(target)
		const left = -originX * target.width
		const top = -originY * target.height

		return new Phaser.Geom.Rectangle(left, top, target.width, target.height)
	}

	private getOriginX(obj: EditableObject): number {
		const fromData = obj.getData('originX')
		if (typeof fromData === 'number') {
			return fromData
		}

		if (obj.kind === 'Container') {
			// In this editor we treat containers as centered by default (origin 0.5/0.5)
			// to match how the edit context frame and alignment behave.
			return 0.5
		}

		return obj.originX
	}

	private getOriginY(obj: EditableObject): number {
		const fromData = obj.getData('originY')
		if (typeof fromData === 'number') {
			return fromData
		}

		if (obj.kind === 'Container') {
			return 0.5
		}

		return obj.originY
	}

	/**
	 * Get the bounds of an object accounting for its rotation.
	 * For example, object when unrotated has size 100x200 (width=100, height=200)
	 *  - when rotated 45 degrees, its bounds will have a width of 212.13 and height of 212.13
	 *  - when rotated 90 degrees, its bounds will have a width of 200 and height of 100 (basically swapped)
	 *  - and so on...
	 */
	public getRotatedBounds(obj: EditableObject, rect?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
		if (obj.kind === 'Container') {
			return getContainerBoxWorldBounds(obj, rect)
		}

		const width = obj.displayWidth
		const height = obj.displayHeight
		const rotation = obj.rotation // in radians
		const originX = this.getOriginX(obj)
		const originY = this.getOriginY(obj)

		// Calculate the corners of the rectangle
		const cos = Math.cos(rotation)
		const sin = Math.sin(rotation)

		const corners = [
			{ x: -width * originX, y: -height * originY },
			{ x: width * (1 - originX), y: -height * originY },
			{ x: width * (1 - originX), y: height * (1 - originY) },
			{ x: -width * originX, y: height * (1 - originY) },
		].map((point) => ({
			x: obj.x + (point.x * cos - point.y * sin),
			y: obj.y + (point.x * sin + point.y * cos),
		}))

		const left = corners.reduce((min, c) => Math.min(min, c.x), Infinity)
		const right = corners.reduce((max, c) => Math.max(max, c.x), -Infinity)
		const top = corners.reduce((min, c) => Math.min(min, c.y), Infinity)
		const bottom = corners.reduce((max, c) => Math.max(max, c.y), -Infinity)

		if (rect) {
			return rect.setTo(left, top, right - left, bottom - top)
		}

		return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)
	}
}
