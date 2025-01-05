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
					obj.y = top + obj.displayHeight * obj.originY
				})

				return true
			})
			.with('vertical-center', () => {
				const center = isOne ? contextBounds.centerY : calculateBounds(objs).centerY

				objs.forEach((obj) => {
					obj.y = center - obj.displayHeight * (0.5 - obj.originY)
				})

				return true
			})
			.with('bottom', () => {
				const bottom = isOne ? contextBounds.bottom : calculateBounds(objs).bottom

				objs.forEach((obj) => {
					obj.y = bottom - obj.displayHeight * (1 - obj.originY)
				})

				return true
			})
			.with('distribute-vertical', () => {
				if (isOne) {
					return false
				}

				// Sort objects by their y position
				const sortedObjs = [...objs].sort((a, b) => a.y - b.y)

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
					obj.x = left + obj.displayWidth * obj.originX
				})

				return true
			})
			.with('horizontal-center', () => {
				const center = isOne ? contextBounds.centerX : calculateBounds(objs).centerX

				objs.forEach((obj) => {
					obj.x = center - obj.displayWidth * (0.5 - obj.originX)
				})

				return true
			})
			.with('right', () => {
				const right = isOne ? contextBounds.right : calculateBounds(objs).right

				objs.forEach((obj) => {
					obj.x = right - obj.displayWidth * (1 - obj.originX)
				})

				return true
			})
			.with('distribute-horizontal', () => {
				if (isOne) {
					return false
				}

				// Sort objects by their x position
				const sortedObjs = [...objs].sort((a, b) => a.x - b.x)

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
		return context.isRoot
			? new Phaser.Geom.Rectangle(0, 0, this.scene.projectSizeFrame!.width, this.scene.projectSizeFrame!.height)
			: context.target.getBounds()
	}

	private alignVertically(objs: EditableObject[], y: number): void {
		objs.forEach((obj) => {
			obj.setY(y)
		})
	}

	private alignHorizontally(objs: EditableObject[], x: number): void {
		objs.forEach((obj) => {
			obj.setX(x)
		})
	}
}
