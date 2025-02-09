import { EditableContainer } from '../EditableContainer'
import { StateChangesEmitter } from '../StateChangesEmitter'
import { BaseEditableComponent } from './base/BaseEditableComponent'
import { PHASER_ALIGN, PhaserAlignKey } from '../PhaserAlign'

export class EditableVerticalLayoutComponent extends BaseEditableComponent {
	public readonly type = 'vertical-layout'

	protected declare _parent: EditableContainer

	private cellWidth = 100
	private cellHeight = 100
	private cellPosition: PhaserAlignKey = 'center'
	private spacingY = 0
	private startY = 0

	private _stateChanges: StateChangesEmitter<VerticalLayoutComponentJson>

	constructor() {
		super()

		this._state = this.createState()

		this._stateChanges = new StateChangesEmitter(
			this._state as VerticalLayoutComponentJson,
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
			this._preAddChecksFactory.requireNoComponentOfType('grid-layout')
		)
	}

	private updateLayout(): void {
		if (!this._parent) {
			return
		}

		Phaser.Actions.GridAlign(this._parent.editables, {
			height: -1,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight,
			position: PHASER_ALIGN[this.cellPosition],
			// spacingY: this.spacingY,
			y: this.startY,
		})

		console.log(`updateLayout: ${this.startY}`)
		// this.parent.setPosition(this.x, this.y)
	}

	public toJson(): VerticalLayoutComponentJson {
		return {
			type: 'vertical-layout',
			active: this._isActive,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight,
			cellPosition: this.cellPosition,
			spacingY: this.spacingY,
			startY: this.startY,
		}
	}

	protected onActivate(): void {
		this.updateLayout()
	}

	protected onDeactivate(): void {}
}

export type VerticalLayoutComponentJson = {
	type: 'vertical-layout'
	active: boolean
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingY: number
	startY: number
}
