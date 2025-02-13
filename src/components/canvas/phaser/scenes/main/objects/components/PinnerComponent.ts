import { TypedEventEmitterEvents } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import {
	GenericEventEmitter,
	signalFromEvent,
} from '@components/canvas/phaser/robowhale/utils/events/create-abort-signal-from-event'
import { isNumericString } from '@sindresorhus/is'
import { match } from 'ts-pattern'
import { EditableContainer } from '../EditableContainer'
import { EditableObject, EditableObjectEmitter } from '../EditableObject'
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
					this.updatePosition()
				},
				y: (value) => {
					this.y = value
					this.updatePosition()
				},
				xOffset: (value) => {
					this.xOffset = value
					this.updatePosition()
				},
				yOffset: (value) => {
					this.yOffset = value
					this.updatePosition()
				},
			},
			this.destroySignal
		)
	}

	private updatePosition(): void {
		if (!this.obj || !this._isActive) {
			return
		}

		const parent = this.obj.parentContainer
		if (!parent) {
			return
		}

		const parentWidth = parent.width
		const parentHeight = parent.height

		const xOffsetData = this.calculateOffsetInPixels(this.xOffset)
		const xOffset = match(xOffsetData)
			.with({ type: 'absolute' }, ({ value }) => value)
			.with({ type: 'percentage' }, ({ value }) => value * this.obj!.displayWidth)
			.with({ type: 'invalid' }, () => 0)
			.exhaustive()

		const x = this.x * parentWidth + xOffset

		const yOffsetData = this.calculateOffsetInPixels(this.yOffset)
		const yOffset = match(yOffsetData)
			.with({ type: 'absolute' }, ({ value }) => value)
			.with({ type: 'percentage' }, ({ value }) => value * this.obj!.displayHeight)
			.with({ type: 'invalid' }, () => 0)
			.exhaustive()

		const y = this.y * parentHeight + yOffset

		this.obj.setPosition(x - parentWidth / 2, y - parentHeight / 2)
	}

	private calculateOffsetInPixels(offsetStr: string): { type: 'absolute' | 'percentage' | 'invalid'; value: number } {
		if (isNumericString(offsetStr)) {
			return { type: 'absolute', value: parseFloat(offsetStr) }
		}

		if (!offsetStr) {
			return { type: 'absolute', value: 0 }
		}

		// strings like '10%', '-50%' or '+100%'
		const percentageStr = offsetStr.match(/^([+-]?\d+)%$/)
		if (percentageStr) {
			const percentage = parseFloat(percentageStr[1]) / 100
			return { type: 'percentage', value: percentage }
		}

		// TODO support offsets like '50% + 10'

		return { type: 'invalid', value: 0 }
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

	override onAdded(obj: EditableObject): void {
		super.onAdded(obj)

		// TODO update position on obj size change

		// update position on parent change
		;(obj.events as EditableObjectEmitter).on(
			'added-to-container',
			(container) => this.onAddedToContainer(obj, container),
			this,
			this.destroySignal
		)

		this.updatePosition()
	}

	private onAddedToContainer(obj: EditableObject, container: EditableContainer): void {
		const event: TypedEventEmitterEvents<EditableObjectEmitter> = 'removed-from-container'
		const emitter = obj.events as GenericEventEmitter
		const removedFromParentSignal = signalFromEvent(emitter, event)

		container.events.on(
			'size-changed',
			this.updatePosition,
			this,
			AbortSignal.any([this.destroySignal, removedFromParentSignal])
		)

		this.updatePosition()
	}

	protected onActivate(): void {
		this.updatePosition()
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
