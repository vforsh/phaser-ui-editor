import { EditableContainer } from '../EditableContainer'
import { EditableObject } from '../EditableObject'
import { PhaserAlignKey } from '../PhaserAlign'
import { StateChangesEmitter } from '../StateChangesEmitter'
import { BaseEditableComponent } from './base/BaseEditableComponent'

export class EditableGridLayoutComponent extends BaseEditableComponent<GridLayoutComponentJson> {
	public readonly type = 'grid-layout'
	private _stateChanges: StateChangesEmitter<GridLayoutComponentJson>
	protected declare _parent: EditableContainer

	private columns = 3
	private cellWidth = 100
	private cellHeight = 100
	private cellPosition: PhaserAlignKey = 'center'
	private spacingX = 0
	private spacingY = 0

	constructor(id: string, initialState?: GridLayoutComponentJson) {
		super(id)

		if (initialState) {
			this._isActive = initialState.active
			this.columns = initialState.columns
			this.cellWidth = initialState.cellWidth
			this.cellHeight = initialState.cellHeight
			this.cellPosition = initialState.cellPosition
			this.spacingX = initialState.spacingX
			this.spacingY = initialState.spacingY
		}

		this._state = this.createState()

		this._stateChanges = new StateChangesEmitter(
			this._state,
			{
				active: (value) => {
					this._isActive = value
				},
				columns: (value) => {
					this.columns = value
					this.updateLayout()
				},
				cellWidth: (value) => {
					this.cellWidth = value
					this.updateLayout()
				},
				cellHeight: (value) => {
					this.cellHeight = value
					this.updateLayout()
				},
				cellPosition: (value) => {
					this.cellPosition = value
					this.updateLayout()
				},
				spacingX: (value) => {
					this.spacingX = value
					this.updateLayout()
				},
				spacingY: (value) => {
					this.spacingY = value
					this.updateLayout()
				},
			},
			this.destroySignal
		)

		this._preAddChecks.push(
			this._preAddChecksFactory.requireObjectType('Container'),
			this._preAddChecksFactory.requireNoComponentOfType('horizontal-layout'),
			this._preAddChecksFactory.requireNoComponentOfType('vertical-layout')
		)
	}

	private updateLayout(): void {
		if (!this._parent || !this._isActive) {
			return
		}

		const rows = Math.ceil(this._parent.editables.length / this.columns)

		this._parent.editables.forEach((child, index) => {
			const row = Math.floor(index / this.columns)
			const col = index % this.columns
			const cellCenterX = col * (this.cellWidth + this.spacingX) + this.cellWidth / 2
			const cellCenterY = row * (this.cellHeight + this.spacingY) + this.cellHeight / 2
			child.setPosition(cellCenterX, cellCenterY)
		})

		const actualColumns = Math.min(this.columns, this._parent.editables.length)
		const width = actualColumns * this.cellWidth + this.spacingX * (actualColumns - 1)
		const height = rows * this.cellHeight + this.spacingY * (rows - 1)
		this._parent.setSize(width, height)
	}

	public toJson(): GridLayoutComponentJson {
		return {
			type: 'grid-layout',
			id: this.id,
			active: this._isActive,
			columns: this.columns,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight,
			cellPosition: this.cellPosition,
			spacingX: this.spacingX,
			spacingY: this.spacingY,
		}
	}

	override onAdded(parent: EditableObject): void {
		super.onAdded(parent)

		this._parent.on('editable-added', this.updateLayout, this, this.destroySignal)
		this._parent.on('editable-removed', this.updateLayout, this, this.destroySignal)

		this.updateLayout()
	}

	protected onActivate(): void {
		this.updateLayout()
	}

	protected onDeactivate(): void {}
}

export type GridLayoutComponentJson = {
	type: 'grid-layout'
	id: string
	active: boolean
	columns: number
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingX: number
	spacingY: number
}
