import { unproxy } from '@state/valtio-utils'
import { EditableContainer } from '../EditableContainer'
import { StateChangesEmitter } from '../StateChangesEmitter'
import { BaseEditableComponent } from './base/BaseEditableComponent'
import { PhaserAlignKey, PHASER_ALIGN } from '../PhaserAlign'

export class EditableHorizontalLayoutComponent extends BaseEditableComponent {
	public readonly type = 'horizontal-layout'

	protected declare _parent: EditableContainer

	private cellWidth = 100
	private cellHeight = 100
	private cellPosition: PhaserAlignKey = 'center'
	private spacingX = 0
	private startX = 0

	private _stateChanges: StateChangesEmitter<HorizontalLayoutComponentJson>

	constructor() {
		super()

		this._state = this.createState()

		this._stateChanges = new StateChangesEmitter(
			this._state as HorizontalLayoutComponentJson,
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
				spacingX: (value) => {
					this.spacingX = value
					this.updateLayout()
				},
				startX: (value) => {
					this.startX = value
					this.updateLayout()
				},
			},
			this.destroySignal
		)

		this._preAddChecks.push(
			this._preAddChecksFactory.requireObjectType('Container'),
			this._preAddChecksFactory.requireNoComponentOfType('vertical-layout'),
			this._preAddChecksFactory.requireNoComponentOfType('grid-layout')
		)
	}

	private updateLayout(): void {
		if (!this._parent) {
			return
		}

		Phaser.Actions.GridAlign(this._parent.editables, {
			width: -1,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight,
			position: PHASER_ALIGN[this.cellPosition],
			// spacingX: this.spacingX,
			x: this.startX,
		})

		console.log(`updateLayout`, unproxy(this._state))
	}

	public toJson(): HorizontalLayoutComponentJson {
		return {
			type: 'horizontal-layout',
			active: this._isActive,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight,
			cellPosition: this.cellPosition,
			spacingX: this.spacingX,
			startX: this.startX,
		}
	}

	protected onActivate(): void {
		this.updateLayout()
	}

	protected onDeactivate(): void {}
}

export type HorizontalLayoutComponentJson = {
	type: 'horizontal-layout'
	active: boolean
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingX: number
	startX: number
}
