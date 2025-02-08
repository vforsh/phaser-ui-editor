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
				x: (value) => (this.x = value),
				y: (value) => (this.y = value),
				xOffset: (value) => (this.xOffset = value),
				yOffset: (value) => (this.yOffset = value),
			},
			this.destroySignal
		)
	}

	public toJson(): PinnerComponentJson {
		return {
			x: this.x,
			y: this.y,
			xOffset: this.xOffset,
			yOffset: this.yOffset,
		}
	}

	protected onActivate(): void {}

	protected onDeactivate(): void {}
}

export type PinnerComponentJson = {
	x: number
	y: number
	xOffset: string
	yOffset: string
}
