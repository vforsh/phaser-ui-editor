import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { proxy } from 'valtio'

import { ComponentsManager } from './components/base/ComponentsManager'
import { EditableComponentJson } from './components/base/EditableComponent'
import {
	CreateEditableObjectJson,
	EDITABLE_SYMBOL,
	EditableObject,
	EditableObjectEvents,
	EditableObjectJson,
	IEditableObject,
	isEditable,
} from './EditableObject'
import { StateChangesEmitter } from './StateChangesEmitter'

type Events = {
	'editable-added': (child: EditableObject) => void
	'editable-removed': (child: EditableObject) => void
	'size-changed': (width: number, height: number, prevWidth: number, prevHeight: number) => void
	'hierarchy-changed': () => void
} & EditableObjectEvents

export type PrefabRef = {
	id: string
	name: string
}

export class EditableContainer extends Phaser.GameObjects.Container implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'Container'
	public readonly id: string
	public localId: string | undefined
	public readonly prefab: PrefabRef | null
	public readonly isRoot: boolean
	private readonly __events = new TypedEventEmitter<Events>()
	private readonly _preDestroyController = new AbortController()
	// copy of editables to track changes in hierarchy
	private _editablesCopy: EditableObject[] = []
	private _isLocked = false
	private _stateObj: EditableContainerJson
	private _stateChanges: StateChangesEmitter<EditableContainerJson>
	private _components: ComponentsManager

	constructor(
		scene: Phaser.Scene,
		id: string,
		prefab: PrefabRef | null,
		x = 0,
		y = 0,
		children: Phaser.GameObjects.GameObject[] = [],
		isRoot = false,
	) {
		super(scene, x, y)

		this.setSize(100, 100)

		this.id = id

		this.prefab = prefab

		this.isRoot = isRoot

		// defer adding children
		// we do it here instead of in `super()` because `__events` is not initialized yet in `super()`
		this.add(children)

		this._components = new ComponentsManager(this)
		this._components.on('component-added', this.onComponentsListChanged, this)
		this._components.on('component-removed', this.onComponentsListChanged, this)
		this._components.on('component-moved', this.onComponentsListChanged, this)

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
			'width': (value) => this.setSize(value, this.height),
			'height': (value) => this.setSize(this.width, value),
		})

		this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.checkForHierarchyChanges, this, this.preDestroySignal)

		this.checkForHierarchyChanges()
	}

	private onComponentsListChanged(): void {
		this._stateObj.components = this._components.items.map((c) => c.state)
	}

	/**
	 * Check if hierarchy has changed.
	 * If so, emit 'hierarchy-changed' event.
	 * @returns true if hierarchy has changed since last check, false otherwise
	 */
	public checkForHierarchyChanges(): boolean {
		if (!this._stateObj) {
			return false
		}

		const editables = this.editables

		const hasChanges =
			editables.length !== this._editablesCopy.length || editables.some((obj, index) => obj !== this._editablesCopy[index])

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

			// @ts-expect-error
			gameObject.events.emit('added-to-container', this)

			// every change in child container will propagate to parent container
			if (gameObject instanceof EditableContainer) {
				gameObject.events.on('hierarchy-changed', () => this.events.emit('hierarchy-changed'), this, this.preDestroySignal)
			}

			this.checkForHierarchyChanges()
		}
	}

	override removeHandler(gameObject: Phaser.GameObjects.GameObject): void {
		super.removeHandler(gameObject)

		if (isEditable(gameObject)) {
			this.events.emit('editable-removed', gameObject)

			// @ts-expect-error
			gameObject.events.emit('removed-from-container', this)

			if (gameObject instanceof EditableContainer) {
				gameObject.events.offByContext(this, 'hierarchy-changed')
			}

			this.checkForHierarchyChanges()
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

		// TODO prefabs: remove props like frameKey and textureKey, don't use toJSON() at all
		return {
			...this.toJSON(),
			id: this.id,
			localId: this.localId,
			prefab: this.prefab,
			type: 'Container',
			depth: this.depth,
			blendMode: this.blendMode,
			name: this.name,
			children,
			scale: { x: this.scaleX, y: this.scaleY },
			locked: this.locked,
			angle: this.angle,
			originX: this.originX,
			originY: this.originY,
			width: this.width,
			height: this.height,
			displayWidth: this.displayWidth,
			displayHeight: this.displayHeight,
			components: this._components.items.map((c) => c.toJson()),
		}
	}

	override destroy(fromScene?: boolean): void {
		this._preDestroyController.abort()

		this._stateChanges.destroy()

		this._components.destroy()

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

	override setX(x: number): this {
		super.setX(x)

		this.withoutEmits((state) => {
			state.x = x
		})

		return this
	}

	override setY(y: number): this {
		super.setY(y)

		this.withoutEmits((state) => {
			state.y = y
		})

		return this
	}

	override setPosition(x: number, y: number): this {
		super.setPosition(x, y)

		this.withoutEmits((state) => {
			state.x = x
			state.y = y
		})

		return this
	}

	public setWidth(width: number): this {
		const prevWidth = this.width
		const prevHeight = this.height
		this.setSize(width, this.height)

		this.withoutEmits((state) => {
			state.width = width
		})

		this.events.emit('size-changed', width, this.height, prevWidth, prevHeight)

		return this
	}

	public setHeight(height: number): this {
		const prevWidth = this.width
		const prevHeight = this.height
		this.setSize(this.width, height)

		this.withoutEmits((state) => {
			state.height = height
		})

		this.events.emit('size-changed', this.width, height, prevWidth, prevHeight)

		return this
	}

	override setSize(width: number, height: number): this {
		const prevWidth = this.width
		const prevHeight = this.height
		super.setSize(width, height)

		this.updateInputHitArea(width, height)

		this.withoutEmits((state) => {
			state.width = width
			state.height = height
		})

		this.events.emit('size-changed', width, height, prevWidth, prevHeight)

		return this
	}

	private updateInputHitArea(width: number, height: number): void {
		if (!this.input?.hitArea) {
			return
		}

		this.input.hitArea.setSize(width, height)
	}

	public setAngleVisualOnly(angle: number): this {
		super.setAngle(angle)
		return this
	}

	public setPositionVisualOnly(x: number, y: number): this {
		super.setPosition(x, y)
		return this
	}

	public setSizeVisualOnly(width: number, height: number): this {
		super.setSize(width, height)
		return this
	}

	public setDisplaySizeVisualOnly(width: number, height: number): this {
		super.setDisplaySize(width, height)
		return this
	}

	public setOriginVisualOnly(x: number, y: number): this {
		// Container doesn't support setOrigin
		return this
	}

	get stateObj() {
		return this._stateObj
	}

	get components() {
		return this._components
	}
}

export type EditableContainerJson = CreateEditableObjectJson<{
	type: 'Container'
	id: string
	children: EditableObjectJson[]
	name: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	locked: boolean
	angle: number
	originX: number
	originY: number
	width: number
	height: number
	displayWidth: number
	displayHeight: number
	components: EditableComponentJson[]

	/**
	 * If the container was created from a prefab, this will be the reference to the prefab.
	 */
	prefab: PrefabRef | null
}>
