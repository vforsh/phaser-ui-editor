import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import {
	CreateEditableObjectJson,
	CreateEditableObjectJsonBasic,
	EDITABLE_SYMBOL,
	EditableObject,
	EditableObjectJson,
	EditableObjectJsonBasic,
	IEditableObject,
	isEditable,
} from './EditableObject'

type Events = {
	'editable-added': (child: EditableObject) => void
	'editable-removed': (child: EditableObject) => void
	'size-changed': (width: number, height: number, prevWidth: number, prevHeight: number) => void
	'hierarchy-changed': () => void
}

export class EditableContainer extends Phaser.GameObjects.Container implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'Container'
	public readonly id: string
	private readonly __events = new TypedEventEmitter<Events>()
	private readonly _preDestroyController = new AbortController()
	private _editablesCopy: EditableObject[] = []
	private _isLocked = false

	constructor(scene: Phaser.Scene, id: string, x = 0, y = 0, children: Phaser.GameObjects.GameObject[] = []) {
		super(scene, x, y)

		this.id = id

		// defer adding children
		// we do it here instead of in `super()` because `__events` is not initialized yet in `super()`
		this.add(children)

		this.checkForHierarchyChanges()
	}

	/**
	 * Check if hierarchy has changed.
	 * If so, emit 'hierarchy-changed' event.
	 * @returns true if hierarchy has changed since last check, false otherwise
	 */
	public checkForHierarchyChanges(): boolean {
		const editables = this.editables

		const hasChanges =
			editables.length !== this._editablesCopy.length ||
			editables.some((obj, index) => obj !== this._editablesCopy[index])

		if (hasChanges) {
			this.events.emit('hierarchy-changed')
		}

		this._editablesCopy = editables

		return hasChanges
	}

	override addHandler(gameObject: Phaser.GameObjects.GameObject): void {
		super.addHandler(gameObject)

		if (isEditable(gameObject)) {
			this.events.emit('editable-added', gameObject)

			// every change in child container will propagate to parent container
			if (gameObject instanceof EditableContainer) {
				gameObject.events.on(
					'hierarchy-changed',
					() => this.events.emit('hierarchy-changed'),
					this,
					this.preDestroySignal
				)
			}
		}
	}

	override removeHandler(gameObject: Phaser.GameObjects.GameObject): void {
		super.removeHandler(gameObject)

		if (isEditable(gameObject)) {
			this.events.emit('editable-removed', gameObject)

			if (gameObject instanceof EditableContainer) {
				gameObject.events.offByContext(this, 'hierarchy-changed')
			}
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
			type: 'Container',
			width: this.width,
			height: this.height,
			depth: this.depth,
			blendMode: this.blendMode,
			name: this.name,
			children,
			scale: { x: this.scaleX, y: this.scaleY },
			locked: this.locked,
		}
	}

	toJsonBasic(): EditableContainerJsonBasic {
		const children = this.editables.map((child) => child.toJsonBasic())

		return {
			type: 'Container',
			id: this.id,
			name: this.name,
			locked: this.locked,
			visible: this.visible,
			children,
		}
	}

	override setSize(width: number, height: number): this {
		const prevWidth = this.width
		const prevHeight = this.height
		super.setSize(width, height)
		this.events.emit('size-changed', width, height, prevWidth, prevHeight)
		return this
	}

	public preUpdate(time: number, deltaMs: number): void {
		this.checkForHierarchyChanges()
	}

	override destroy(): void {
		this._preDestroyController.abort()

		super.destroy()

		this.__events.destroy()

		this._editablesCopy.length = 0
	}

	get preDestroySignal(): AbortSignal {
		return this._preDestroyController.signal
	}

	get events(): TypedEventEmitter<Events> {
		return this.__events
	}

	set locked(value: boolean) {
		this._isLocked = value
	}

	get locked(): boolean {
		return this._isLocked
	}

	get isResizable(): boolean {
		return true
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
	locked: boolean
}>

export type EditableContainerJsonBasic = CreateEditableObjectJsonBasic<{
	type: 'Container'
	children: EditableObjectJsonBasic[]
}>
