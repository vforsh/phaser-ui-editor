import {
	CreateEditableObjectJson,
	EditableObject,
	EditableObjectJson,
	getEditableObjectClass,
	IEditableObject,
	isEditable,
} from './EditableObject'

export class EditableContainer extends Phaser.GameObjects.Container implements IEditableObject {
	constructor(scene: Phaser.Scene, x: number, y: number, children: Phaser.GameObjects.GameObject[] = []) {
		super(scene, x, y, children)
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
