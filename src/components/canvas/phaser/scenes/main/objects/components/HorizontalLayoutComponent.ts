import { EditableContainer } from '../EditableContainer'
import { EditableObject } from '../EditableObject'
import { PhaserAlignKey } from '../PhaserAlign'
import { StateChangesEmitter } from '../StateChangesEmitter'
import { BaseEditableComponent } from './base/BaseEditableComponent'
import { alignChildrenAroundCenter, getCellCenterOffset } from './LayoutUtils'

export class HorizontalLayoutComponent extends BaseEditableComponent<HorizontalLayoutComponentJson> {
	public readonly type = 'horizontal-layout'
	private _stateChanges: StateChangesEmitter<HorizontalLayoutComponentJson>
	protected declare _obj: EditableContainer

	private cellWidth = 100
	private cellHeight = 100
	private cellPosition: PhaserAlignKey = 'center'
	private spacingX = 0

	constructor(id: string, initialState?: HorizontalLayoutComponentJson) {
		super(id)

		if (initialState) {
			this._isActive = initialState.active
			this.cellWidth = initialState.cellWidth
			this.cellHeight = initialState.cellHeight
			this.cellPosition = initialState.cellPosition
			this.spacingX = initialState.spacingX
		}

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
				spacingX: (value) => {
					this.spacingX = value
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
		if (!this._obj || !this._isActive) {
			return
		}

		// if height is not set, use auto-height = the max height of the children
		const height = this.cellHeight || this.getMaxDisplayHeight(this._obj.editables)

		this._obj.editables.forEach((child, index) => {
			const { x: xOffset, y: yOffset } = getCellCenterOffset(this.cellPosition, this.cellWidth, height)
			const cellCenterX = index * (this.cellWidth + this.spacingX) + this.cellWidth / 2
			const cellCenterY = height / 2
			child.setPosition(cellCenterX + xOffset, cellCenterY + yOffset)
		})

		const childrenNum = this._obj.editables.length
		const width = childrenNum * this.cellWidth + this.spacingX * (childrenNum - 1)
		this._obj.setSize(width, height)

		alignChildrenAroundCenter(this._obj)
	}

	private getMaxDisplayHeight(editables: EditableObject[]): number {
		return editables.reduce((max, child) => Math.max(max, child.displayHeight), 0)
	}

	public toJson(): HorizontalLayoutComponentJson {
		return {
			type: 'horizontal-layout',
			id: this.id,
			active: this._isActive,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight,
			cellPosition: this.cellPosition,
			spacingX: this.spacingX,
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

export type HorizontalLayoutComponentJson = {
	type: 'horizontal-layout'
	id: string
	active: boolean
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingX: number
}
