import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { match } from 'ts-pattern'
import { EditableImage } from './EditableImage'
import {
	CreateEditableObjectJson,
	EditableObject,
	EditableObjectClass,
	EditableObjectJson,
	EditableObjectJsonType,
	IEditableObject,
} from './EditableObject'

type Events = {
	'editable-added': (child: EditableObject) => void
	'editable-removed': (child: EditableObject) => void
	'size-changed': (width: number, height: number, prevWidth: number, prevHeight: number) => void
}

export class EditableContainer extends Phaser.GameObjects.Container implements IEditableObject {
	private readonly __events = new TypedEventEmitter<Events>()

	constructor(scene: Phaser.Scene, x = 0, y = 0, children: Phaser.GameObjects.GameObject[] = []) {
		super(scene, x, y)

		// defer adding children
		// we do it here instead of in `super()` because `__events` is not initialized yet in `super()`
		this.add(children)
	}

	override addHandler(gameObject: Phaser.GameObjects.GameObject): void {
		super.addHandler(gameObject)

		if (isEditable(gameObject)) {
			this.events.emit('editable-added', gameObject)
		}
	}

	override removeHandler(gameObject: Phaser.GameObjects.GameObject): void {
		super.removeHandler(gameObject)

		if (isEditable(gameObject)) {
			this.events.emit('editable-removed', gameObject)
		}
	}

	get editables(): EditableObject[] {
		return this.list.filter((child) => isEditable(child))
	}

	get editablesAsString(): string {
		const items = this.editables
		return `[${items.map((e) => e.type).join(', ')}] (${items.length})`
	}

	toJson(): EditableContainerJson {
		const children = this.editables.map((child) => child.toJson())

		return {
			...this.toJSON(),
			width: this.width,
			height: this.height,
			depth: this.depth,
			blendMode: this.blendMode,
			name: this.name,
			children,
			scale: { x: this.scaleX, y: this.scaleY },
			type: 'Container',
		}
	}

	static fromJson<T extends EditableContainerJson>(json: T, scene: Phaser.Scene): EditableContainer {
		const children = json.children.map(
			(childJson) =>
				// @ts-expect-error
				getEditableObjectClass(childJson.type).fromJson(childJson, scene) as EditableObject
		)
		const container = new EditableContainer(scene, json.x, json.y, children)

		container.setScale(json.scale.x, json.scale.y)
		container.setRotation(json.rotation)
		container.setAlpha(json.alpha)
		container.setVisible(json.visible)
		container.setName(json.name)
		container.setDepth(json.depth)
		container.setBlendMode(json.blendMode)
		container.setSize(json.width, json.height)

		return container
	}

	override setSize(width: number, height: number): this {
		const prevWidth = this.width
		const prevHeight = this.height
		super.setSize(width, height)
		this.events.emit('size-changed', width, height, prevWidth, prevHeight)
		return this
	}

	override destroy(): void {
		super.destroy()

		this.__events.destroy()
	}

	get events(): TypedEventEmitter<Events> {
		return this.__events
	}
}

export type EditableContainerJson = CreateEditableObjectJson<{
	type: 'Container'
	width: number
	height: number
	children: EditableObjectJson[]
	name: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
}>

export function isEditable(obj: Phaser.GameObjects.GameObject): obj is EditableObject {
	// return EDITABLE_CLASSES.some((cls) => obj instanceof cls)
	return obj instanceof EditableContainer || obj instanceof EditableImage
}

export function getEditableObjectClass(jsonType: EditableObjectJsonType): EditableObjectClass {
	return match(jsonType)
		.returnType<EditableObjectClass>()
		.with('Container', () => EditableContainer)
		.with('Image', () => EditableImage)
		.exhaustive()
}
