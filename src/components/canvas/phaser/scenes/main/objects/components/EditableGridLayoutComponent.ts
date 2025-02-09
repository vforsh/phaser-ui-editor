import { EditableContainer } from '../EditableContainer'
import { EditableObject } from '../EditableObject'
import { PHASER_ALIGN, PhaserAlignKey } from '../PhaserAlign'
import { StateChangesEmitter } from '../StateChangesEmitter'
import { BaseEditableComponent } from './base/BaseEditableComponent'

export class EditableGridLayoutComponent extends BaseEditableComponent<GridLayoutComponentJson> {
	public readonly type = 'grid-layout'

	protected declare _parent: EditableContainer

	private columns = 3
	private cellWidth = 100
	private cellHeight = 100
	private cellPosition: PhaserAlignKey = 'center'
	private spacingX = 0
	private spacingY = 0
	private startX = 0
	private startY = 0

	private _stateChanges: StateChangesEmitter<GridLayoutComponentJson>

	constructor() {
		super()

		this._state = this.createState()

		this._stateChanges = new StateChangesEmitter(
			this._state,
			{
				active: (value) => {
					this._isActive = value
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
				spacingY: (value) => {
					this.spacingY = value
					this.updateLayout()
				},
				startY: (value) => {
					this.startY = value
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

		Phaser.Actions.GridAlign(this._parent.editables, {
			width: this.columns,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight,
			position: PHASER_ALIGN[this.cellPosition],
			// spacingX: this.spacingX,
			// spacingY: this.spacingY,
			x: this.startX,
			y: this.startY,
		})
	}

	public toJson(): GridLayoutComponentJson {
		return {
			type: 'grid-layout',
			active: this._isActive,
			columns: this.columns,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight,
			cellPosition: this.cellPosition,
			spacingX: this.spacingX,
			spacingY: this.spacingY,
			startX: this.startX,
			startY: this.startY,
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
	active: boolean
	columns: number
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingX: number
	spacingY: number
	startX: number
	startY: number
}
