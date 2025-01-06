import { CreateEditableObjectJson, CreateEditableObjectJsonBasic, IEditableObject } from './EditableObject'

export class EditableBitmapText extends Phaser.GameObjects.BitmapText implements IEditableObject {
	private _isLocked = false

	constructor(
		scene: Phaser.Scene,
		x: number,
		y: number,
		font: string,
		text?: string | string[],
		size?: number,
		align?: number
	) {
		super(scene, x, y, font, text, size, align)
	}

	toJson(): EditableBitmapTextJson {
		return {
			...this.toJSON(),
			type: 'BitmapText',
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
			font: this.font,
			fontSize: this.fontSize,
			align: this.align,
			maxWidth: this.maxWidth,
		}
	}

	toJsonBasic(): EditableBitmapTextJsonBasic {
		return {
			type: 'BitmapText',
			name: this.name,
			locked: this.locked,
			visible: this.visible,
		}
	}

	static fromJson<T extends EditableBitmapTextJson>(json: T, scene: Phaser.Scene): EditableBitmapText {
		const text = new EditableBitmapText(scene, json.x, json.y, json.font, json.text, json.fontSize, json.align)
		text.setName(json.name)
		text.setVisible(json.visible)
		text.setAlpha(json.alpha)
		text.setRotation(json.rotation)
		text.setDepth(json.depth)
		text.setBlendMode(json.blendMode)
		text.setScale(json.scale.x, json.scale.y)
		text.setOrigin(json.origin.x, json.origin.y)
		text.setMaxWidth(json.maxWidth)
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

	// @ts-expect-error
	set displayWidth(value: number) {
		// HACK
	}

	// @ts-expect-error
	set displayHeight(value: number) {
		// HACK
	}
}

export type EditableBitmapTextJson = CreateEditableObjectJson<{
	type: 'BitmapText'
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	origin: { x: number; y: number }
	locked: boolean
	text: string
	font: string
	fontSize: number
	align: number
	maxWidth: number
}>

export type EditableBitmapTextJsonBasic = CreateEditableObjectJsonBasic<{
	type: 'BitmapText'
	name: string
	locked: boolean
	visible: boolean
}>
