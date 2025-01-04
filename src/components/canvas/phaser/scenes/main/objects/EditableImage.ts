import { CreateEditableObjectJson, IEditableObject } from './EditableObject'

export class EditableImage extends Phaser.GameObjects.Image implements IEditableObject {
	constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
		super(scene, x, y, texture, frame)
	}

	toJson(): EditableImageJson {
		return this.toJSON() as EditableImageJson
	}

	static fromJson<T extends EditableImageJson>(json: T, scene: Phaser.Scene): EditableImage {
		const image = new EditableImage(scene, json.x, json.y, json.textureKey, json.frameKey)
		image.setDepth(json.depth)
		image.setBlendMode(json.blendMode)
		image.setScale(json.scale.x, json.scale.y)
		image.setName(json.name)
		return image
	}
}

export type EditableImageJson = CreateEditableObjectJson<{
	type: 'Image'
	name: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
}>
