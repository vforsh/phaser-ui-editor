import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { proxy } from 'valtio'
import {
	CreateEditableObjectJson,
	EDITABLE_SYMBOL,
	EditableObject,
	EditableObjectJson,
	IEditableObject,
	isEditable,
} from './IEditableObject'
import { StateChangesEmitter } from './StateChangesEmitter'

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
	// copy of editables to track changes in hierarchy
	private _editablesCopy: EditableObject[] = []
	private _isLocked = false
	private _stateObj: EditableContainerJson
	private _stateChanges: StateChangesEmitter<EditableContainerJson>

	constructor(scene: Phaser.Scene, id: string, x = 0, y = 0, children: Phaser.GameObjects.GameObject[] = []) {
		super(scene, x, y)

		this.id = id

		// defer adding children
		// we do it here instead of in `super()` because `__events` is not initialized yet in `super()`
		this.add(children)

		this._stateObj = proxy(this.toJson())

		// state changes are reflected in the underlying Phaser object
		this._stateChanges = new StateChangesEmitter(this._stateObj as Omit<EditableContainerJson, 'children'>, {
			'name': (value) => (this.name = value),
			'visible': (value) => (this.visible = value),
			'locked': (value) => (this._isLocked = value),
			'angle': (value) => (this.angle = value),
			'x': (value) => (this.x = value),
			'y': (value) => (this.y = value),
			// 'originX': (value) => this.setOrigin(value, this.originY),
			// 'originY': (value) => this.setOrigin(this.originX, value),
			'scale.x': (value) => (this.scaleX = value),
			'scale.y': (value) => (this.scaleY = value),
			'alpha': (value) => (this.alpha = value),
			// 'tint': (value) => (this.tint = value),
			// 'tintFill': (value) => (this.tintFill = value),
			// 'frameKey': (value) => this.setFrame(value),
		})

		this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.checkForHierarchyChanges, this, this.preDestroySignal)

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
			this._stateObj.children = editables.map((obj) => obj.stateObj)
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

	/**
	 * Use this method to change the state without applying these changes to the underlying Phaser object.
	 */
	private withoutEmits(fn: (state: EditableContainerJson) => void): void {
		if (!this._stateObj || !this._stateChanges) return

		const prev = this._stateChanges.emitsEnabled
		this._stateChanges.emitsEnabled = false
		fn(this._stateObj)
		this._stateChanges.emitsEnabled = prev
	}

	toJson(): EditableContainerJson {
		const children = this.editables.map((child) => child.toJson())

		return {
			...this.toJSON(),
			id: this.id,
			type: 'Container',
			width: this.width,
			height: this.height,
			depth: this.depth,
			blendMode: this.blendMode,
			name: this.name,
			children,
			scale: { x: this.scaleX, y: this.scaleY },
			locked: this.locked,
			angle: this.angle,
			originX: this.originX,
			originY: this.originY,
		}
	}

	override setSize(width: number, height: number): this {
		const prevWidth = this.width
		const prevHeight = this.height
		super.setSize(width, height)
		this.events.emit('size-changed', width, height, prevWidth, prevHeight)
		return this
	}

	override destroy(fromScene?: boolean): void {
		this._preDestroyController.abort()

		this._stateChanges.destroy()

		super.destroy(fromScene)

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

	// @ts-expect-error
	get name(): string {
		return this._stateObj?.name || ''
	}

	set name(value: string) {
		if (this._stateObj) {
			this._stateObj.name = value
		}
	}

	override setPosition(x?: number, y?: number): this {
		super.setPosition(x, y)

		this.withoutEmits((state) => {
			state.x = x ?? this.x
			state.y = y ?? this.y
		})

		return this
	}

	override setDisplaySize(width: number, height: number): this {
		super.setDisplaySize(width, height)

		this.withoutEmits((state) => {
			state.scale.x = this.scaleX
			state.scale.y = this.scaleY
		})

		return this
	}

	override setAngle(angle: number): this {
		super.setAngle(angle)

		this.withoutEmits((state) => {
			state.angle = angle
		})

		return this
	}

	get stateObj() {
		return this._stateObj
	}
}

export type EditableContainerJson = CreateEditableObjectJson<{
	type: 'Container'
	id: string
	width: number
	height: number
	children: EditableObjectJson[]
	name: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	locked: boolean
	angle: number
	originX: number
	originY: number
}>
