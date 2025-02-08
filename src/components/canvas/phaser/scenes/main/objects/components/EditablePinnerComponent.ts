import { StateChangesEmitter } from '../StateChangesEmitter'
import { BaseEditableComponent } from './BaseEditableComponent'

export class EditablePinnerComponent extends BaseEditableComponent {
	public readonly type = 'pinner'

	private x = 0
	private y = 0
	private xOffset = '0'
	private yOffset = '0'
	private _stateChanges: StateChangesEmitter<PinnerComponentJson>

	constructor() {
		super()

		this._state = this.createState()

		this._stateChanges = new StateChangesEmitter(
			this._state as PinnerComponentJson,
			{
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
				active: (value) => {
					this._isActive = value
				},
			},
			this.destroySignal
		)
	}

	private updateParentPosition(): void {
		if (!this.parent) {
			return
		}

		console.log(`updateParentPosition: ${this.x}, ${this.y} (${this.xOffset}, ${this.yOffset})`)
		// this.parent.setPosition(this.x, this.y)
	}

	public toJson(): PinnerComponentJson {
		return {
			type: 'pinner',
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
	active: boolean
	x: number
	y: number
	xOffset: string
	yOffset: string
}
