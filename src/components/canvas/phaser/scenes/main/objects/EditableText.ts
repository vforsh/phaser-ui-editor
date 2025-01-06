import { CreateEditableObjectJson, CreateEditableObjectJsonBasic, IEditableObject } from './EditableObject'

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle

export class EditableText extends Phaser.GameObjects.Text implements IEditableObject {
	private _isLocked = false

	constructor(scene: Phaser.Scene, x: number, y: number, text: string, style: TextStyle) {
		super(scene, x, y, text, style)
	}

	toJson(): EditableTextJson {
		return {
			...this.toJSON(),
			type: 'Text',
			depth: this.depth,
			blendMode: this.blendMode,
			scale: {
				x: this.scaleX,
				y: this.scaleY,
			},
			origin: {
				x: this.originX,
				y: this.originY,
			},
			locked: this.locked,
			text: this.text,
			style: this.style.toJSON(),
		}
	}

	toJsonBasic(): EditableTextJsonBasic {
		return {
			type: 'Text',
			name: this.name,
			locked: this.locked,
			visible: this.visible,
		}
	}

	static fromJson<T extends EditableTextJson>(json: T, scene: Phaser.Scene): EditableText {
		const text = new EditableText(scene, json.x, json.y, json.text, json.style)
		text.setName(json.name)
		text.setVisible(json.visible)
		text.setAlpha(json.alpha)
		text.setRotation(json.rotation)
		text.setDepth(json.depth)
		text.setBlendMode(json.blendMode)
		text.setScale(json.scale.x, json.scale.y)
		text.setOrigin(json.origin.x, json.origin.y)
		text.locked = json.locked
		return text
	}

	set locked(value: boolean) {
		this._isLocked = value
	}

	get locked(): boolean {
		return this._isLocked
	}

	get isResizable() {
		return false
	}
}

export type EditableTextJson = CreateEditableObjectJson<{
	type: 'Text'
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	origin: { x: number; y: number }
	locked: boolean
	text: string
	style: object
}>

export type EditableTextJsonBasic = CreateEditableObjectJsonBasic<{
	type: 'Text'
	name: string
	locked: boolean
	visible: boolean
}>
