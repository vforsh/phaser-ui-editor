import { unproxy } from '@state/valtio-utils'
import { StateChangesEmitter } from '../StateChangesEmitter'
import { BaseEditableComponent } from './base/BaseEditableComponent'

export class PinnerComponent extends BaseEditableComponent<PinnerComponentJson> {
	public readonly type = 'pinner'
	private _stateChanges: StateChangesEmitter<PinnerComponentJson>

	private x = 0
	private y = 0
	private xOffset = '0'
	private yOffset = '0'

	constructor(id: string, initialState?: PinnerComponentJson) {
		super(id)

		if (initialState) {
			this._isActive = initialState.active
			this.x = initialState.x
			this.y = initialState.y
			this.xOffset = initialState.xOffset
			this.yOffset = initialState.yOffset
		}

		this._state = this.createState()

		this._stateChanges = new StateChangesEmitter(
			this._state,
			{
				active: (value) => {
					this._isActive = value
				},
				x: (value) => {
					this.x = value
					this.updateParentPosition()
				},
				y: (value) => {
					this.y = value
					this.updateParentPosition()
				},
				xOffset: (value) => {
					this.xOffset = value
					this.updateParentPosition()
				},
				yOffset: (value) => {
					this.yOffset = value
					this.updateParentPosition()
				},
			},
			this.destroySignal
		)
	}

	private updateParentPosition(): void {
		if (!this.parent || !this._isActive) {
			return
		}

		console.log(`pinner update`, unproxy(this._state))
	}

	public toJson(): PinnerComponentJson {
		return {
			type: 'pinner',
			id: this.id,
			active: this._isActive,
			x: this.x,
			y: this.y,
			xOffset: this.xOffset,
			yOffset: this.yOffset,
		}
	}

	protected onActivate(): void {
		this.updateParentPosition()
	}

	protected onDeactivate(): void {}
}

export type PinnerComponentJson = {
	type: 'pinner'
	id: string
	active: boolean
	x: number
	y: number
	xOffset: string
	yOffset: string
}
