import { Logger } from 'tslog'
import { getEditableObjectClass } from '../objects/EditableContainer'
import { EditableObject, EditableObjectJson } from '../objects/EditableObject'

export interface CloneOptions {
	addToScene?: boolean
}

export interface ObjectsFactoryOptions {
	scene: Phaser.Scene
	logger: Logger<{}>
}

export class ObjectsFactory {
	private scene: Phaser.Scene
	private logger: Logger<{}>

	constructor(options: ObjectsFactoryOptions) {
		this.scene = options.scene
		this.logger = options.logger
	}

	public toJson(obj: EditableObject): EditableObjectJson {
		return obj.toJson()
	}

	/**
	 * Creates an object but it **doesn't add it to the scene**
	 */
	public fromJson(json: EditableObjectJson): EditableObject {
		// @ts-expect-error
		return getEditableObjectClass(json.type).fromJson(json, this.scene)
	}

	public clone(obj: EditableObject, options?: CloneOptions): EditableObject {
		const json = obj.toJson()

		const cloned = this.fromJson(json)

		if (options?.addToScene) {
			this.scene.add.existing(cloned)
		}

		return cloned
	}
}
