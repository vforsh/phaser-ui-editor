import { EditableContainer } from '../EditableContainer'
import { EditableObject } from '../EditableObject'
import { PhaserAlignKey } from '../PhaserAlign'
import { StateChangesEmitter } from '../StateChangesEmitter'
import { BaseEditableComponent } from './base/BaseEditableComponent'
import { alignChildrenAroundCenter, getCellCenterOffset } from './LayoutUtils'

export class VerticalLayoutComponent extends BaseEditableComponent<VerticalLayoutComponentJson> {
	public readonly type = 'vertical-layout'
	private _stateChanges: StateChangesEmitter<VerticalLayoutComponentJson>
	protected declare _obj: EditableContainer

	private cellWidth = 100
	private cellHeight = 100
	private cellPosition: PhaserAlignKey = 'center'
	private spacingY = 0

	constructor(id: string, initialState?: VerticalLayoutComponentJson) {
		super(id)

		if (initialState) {
			this._isActive = initialState.active
			this.cellWidth = initialState.cellWidth
			this.cellHeight = initialState.cellHeight
			this.cellPosition = initialState.cellPosition
			this.spacingY = initialState.spacingY
		}

		this._state = this.createState()

		this._stateChanges = new StateChangesEmitter(
			this._state,
			{
				active: (value) => {
					value ? this.activate() : this.deactivate()
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
		if (!this._obj || !this._isActive) {
			return
		}

		// if width is not set, use auto-width = the max width of the children
		const width = this.cellWidth || this.getMaxDisplayWidth(this._obj.editables)

		this._obj.editables.forEach((child, index) => {
			const { x: xOffset, y: yOffset } = getCellCenterOffset(this.cellPosition, width, this.cellHeight)
			const cellCenterX = width / 2
			const cellCenterY = index * (this.cellHeight + this.spacingY) + this.cellHeight / 2
			child.setPosition(cellCenterX + xOffset, cellCenterY + yOffset)
		})

		const childrenNum = this._obj.editables.length
		const height = childrenNum * this.cellHeight + this.spacingY * (childrenNum - 1)
		this._obj.setSize(width, height)

		alignChildrenAroundCenter(this._obj)
	}

	private getMaxDisplayWidth(editables: EditableObject[]): number {
		return editables.reduce((max, child) => Math.max(max, child.displayWidth), 0)
	}

	public toJson(): VerticalLayoutComponentJson {
		return {
			type: 'vertical-layout',
			id: this.id,
			active: this._isActive,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight,
			cellPosition: this.cellPosition,
			spacingY: this.spacingY,
		}
	}

	override onAdded(obj: EditableObject): void {
		super.onAdded(obj)

		this._obj.events.on('editable-added', this.updateLayout, this, this.destroySignal)
		this._obj.events.on('editable-removed', this.updateLayout, this, this.destroySignal)

		this.updateLayout()
	}

	protected onActivate(): void {
		this.updateLayout()
	}

	protected onDeactivate(): void {}
}

export type VerticalLayoutComponentJson = {
	type: 'vertical-layout'
	id: string
	active: boolean
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingY: number
}
