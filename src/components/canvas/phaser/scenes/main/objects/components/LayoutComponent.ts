import { P, match } from 'ts-pattern'
import type { Logger } from 'tslog'
import { EditableBitmapText } from '../EditableBitmapText'
import { EditableContainer } from '../EditableContainer'
import { EditableImage } from '../EditableImage'
import { EditableNineSlice } from '../EditableNineSlice'
import { EditableObject } from '../EditableObject'
import { EditableText } from '../EditableText'
import type { MainScene } from '../../MainScene'
import { StateChangesEmitter } from '../StateChangesEmitter'
import { BaseEditableComponent } from './base/BaseEditableComponent'

export type LayoutUnit = 'px' | 'percent'

export type LayoutScalar = {
	value: number
	unit: LayoutUnit
}

export type HorizontalConstraint =
	| { mode: 'none' }
	| { mode: 'start'; start: LayoutScalar }
	| { mode: 'center'; center: LayoutScalar }
	| { mode: 'end'; end: LayoutScalar }
	| { mode: 'stretch'; start: LayoutScalar; end: LayoutScalar }

export type VerticalConstraint =
	| { mode: 'none' }
	| { mode: 'start'; start: LayoutScalar }
	| { mode: 'center'; center: LayoutScalar }
	| { mode: 'end'; end: LayoutScalar }
	| { mode: 'stretch'; start: LayoutScalar; end: LayoutScalar }

export type LayoutComponentJson = {
	type: 'layout'
	id: string
	active: boolean
	horizontal: HorizontalConstraint
	vertical: VerticalConstraint
}

type LayoutApplyResult = {
	resizedContainer?: EditableContainer
}

const DEFAULT_SCALAR: LayoutScalar = { value: 0, unit: 'px' }

export class LayoutComponent extends BaseEditableComponent<LayoutComponentJson> {
	public readonly type = 'layout'
	private _stateChanges: StateChangesEmitter<LayoutComponentJson>
	private horizontal: HorizontalConstraint = { mode: 'none' }
	private vertical: VerticalConstraint = { mode: 'none' }
	private didWarnParentConflict = false
	private didWarnNonResizable = false
	private didWarnNegativeWidth = false
	private didWarnNegativeHeight = false

	constructor(id: string, initialState?: LayoutComponentJson) {
		super(id)

		if (initialState) {
			this._isActive = initialState.active
			this.horizontal = cloneHorizontalConstraint(initialState.horizontal)
			this.vertical = cloneVerticalConstraint(initialState.vertical)
		}

		this._state = this.createState()

		const invalidate = () => {
			this.syncFromState()
			this.invalidateParent()
		}

		this._stateChanges = new StateChangesEmitter(
			this._state,
			{
				active: (value) => {
					value ? this.activate() : this.deactivate()
				},
				horizontal: invalidate,
				vertical: invalidate,
				'horizontal.mode': invalidate,
				'horizontal.start.value': invalidate,
				'horizontal.start.unit': invalidate,
				'horizontal.center.value': invalidate,
				'horizontal.center.unit': invalidate,
				'horizontal.end.value': invalidate,
				'horizontal.end.unit': invalidate,
				'vertical.mode': invalidate,
				'vertical.start.value': invalidate,
				'vertical.start.unit': invalidate,
				'vertical.center.value': invalidate,
				'vertical.center.unit': invalidate,
				'vertical.end.value': invalidate,
				'vertical.end.unit': invalidate,
			},
			this.destroySignal
		)
	}

	public get active(): boolean {
		return this._isActive
	}

	public apply(parent: EditableContainer, logger: Logger<{}>): LayoutApplyResult {
		if (!this._obj || !this._isActive) {
			return {}
		}

		const stretchActive = this.horizontal.mode === 'stretch' || this.vertical.mode === 'stretch'
		if (!stretchActive) {
			this.didWarnNonResizable = false
		}

		const conflictType = this.getParentLayoutConflict(parent)
		if (conflictType) {
			if (!this.didWarnParentConflict) {
				logger.warn(
					`Layout disabled for '${this._obj.name}'(${this._obj.id}) because parent '${parent.name}'(${parent.id}) controls layout via '${conflictType}'.`
				)
				this.didWarnParentConflict = true
			}
			return {}
		}

		this.didWarnParentConflict = false

		const obj = this._obj

		const parentLeft = -parent.width * parent.originX
		const parentTop = -parent.height * parent.originY
		const parentRight = parentLeft + parent.width
		const parentBottom = parentTop + parent.height
		const parentCenterX = parentLeft + parent.width / 2
		const parentCenterY = parentTop + parent.height / 2

		const beforeSize = getCurrentSize(obj)

		this.applyHorizontal(obj, parent, {
			left: parentLeft,
			right: parentRight,
			center: parentCenterX,
			logger,
		})

		this.applyVertical(obj, parent, {
			top: parentTop,
			bottom: parentBottom,
			center: parentCenterY,
			logger,
		})

		const afterSize = getCurrentSize(obj)
		const resized =
			Math.abs(afterSize.width - beforeSize.width) > 0.0001 ||
			Math.abs(afterSize.height - beforeSize.height) > 0.0001

		if (resized && obj instanceof EditableContainer) {
			return { resizedContainer: obj }
		}

		return {}
	}

	public toJson(): LayoutComponentJson {
		return {
			type: 'layout',
			id: this.id,
			active: this._isActive,
			horizontal: cloneHorizontalConstraint(this.horizontal),
			vertical: cloneVerticalConstraint(this.vertical),
		}
	}

	override onAdded(obj: EditableObject): void {
		super.onAdded(obj)
		this.invalidateParent()
	}

	protected onActivate(): void {
		this.invalidateParent()
	}

	protected onDeactivate(): void {}

	private applyHorizontal(
		obj: EditableObject,
		parent: EditableContainer,
		args: { left: number; right: number; center: number; logger: Logger<{}> }
	): void {
		switch (this.horizontal.mode) {
			case 'none':
				this.didWarnNegativeWidth = false
				return
			case 'start': {
				this.didWarnNegativeWidth = false
				const startPx = resolveScalar(this.horizontal.start, parent.width)
				const left = args.left + startPx
				obj.setX(left + obj.displayWidth * obj.originX)
				return
			}
			case 'center': {
				this.didWarnNegativeWidth = false
				const centerPx = resolveScalar(this.horizontal.center, parent.width)
				obj.setX(args.center + centerPx)
				return
			}
			case 'end': {
				this.didWarnNegativeWidth = false
				const endPx = resolveScalar(this.horizontal.end, parent.width)
				const right = args.right - endPx
				obj.setX(right - obj.displayWidth * (1 - obj.originX))
				return
			}
			case 'stretch': {
				const startPx = resolveScalar(this.horizontal.start, parent.width)
				const endPx = resolveScalar(this.horizontal.end, parent.width)
				let desiredWidth = parent.width - startPx - endPx
				if (desiredWidth < 0) {
					desiredWidth = 0
					if (!this.didWarnNegativeWidth) {
						args.logger.warn(
							`Layout stretch resulted in negative width for '${obj.name}'(${obj.id}); clamped to 0.`
						)
						this.didWarnNegativeWidth = true
					}
				} else {
					this.didWarnNegativeWidth = false
				}

				const resized = resizeObject(obj, desiredWidth, undefined, args.logger, this.didWarnNonResizable)
				if (resized === 'non-resizable') {
					this.didWarnNonResizable = true
				} else if (resized === 'resized' || resized === 'skipped') {
					this.didWarnNonResizable = false
				}

				const left = args.left + startPx
				obj.setX(left + obj.displayWidth * obj.originX)
				return
			}
		}
	}

	private applyVertical(
		obj: EditableObject,
		parent: EditableContainer,
		args: { top: number; bottom: number; center: number; logger: Logger<{}> }
	): void {
		switch (this.vertical.mode) {
			case 'none':
				this.didWarnNegativeHeight = false
				return
			case 'start': {
				this.didWarnNegativeHeight = false
				const startPx = resolveScalar(this.vertical.start, parent.height)
				const top = args.top + startPx
				obj.setY(top + obj.displayHeight * obj.originY)
				return
			}
			case 'center': {
				this.didWarnNegativeHeight = false
				const centerPx = resolveScalar(this.vertical.center, parent.height)
				obj.setY(args.center + centerPx)
				return
			}
			case 'end': {
				this.didWarnNegativeHeight = false
				const endPx = resolveScalar(this.vertical.end, parent.height)
				const bottom = args.bottom - endPx
				obj.setY(bottom - obj.displayHeight * (1 - obj.originY))
				return
			}
			case 'stretch': {
				const startPx = resolveScalar(this.vertical.start, parent.height)
				const endPx = resolveScalar(this.vertical.end, parent.height)
				let desiredHeight = parent.height - startPx - endPx
				if (desiredHeight < 0) {
					desiredHeight = 0
					if (!this.didWarnNegativeHeight) {
						args.logger.warn(
							`Layout stretch resulted in negative height for '${obj.name}'(${obj.id}); clamped to 0.`
						)
						this.didWarnNegativeHeight = true
					}
				} else {
					this.didWarnNegativeHeight = false
				}

				const resized = resizeObject(obj, undefined, desiredHeight, args.logger, this.didWarnNonResizable)
				if (resized === 'non-resizable') {
					this.didWarnNonResizable = true
				} else if (resized === 'resized' || resized === 'skipped') {
					this.didWarnNonResizable = false
				}

				const top = args.top + startPx
				obj.setY(top + obj.displayHeight * obj.originY)
				return
			}
		}
	}

	private getParentLayoutConflict(parent: EditableContainer): 'horizontal-layout' | 'vertical-layout' | 'grid-layout' | null {
		if (parent.components.get('horizontal-layout')) {
			return 'horizontal-layout'
		}
		if (parent.components.get('vertical-layout')) {
			return 'vertical-layout'
		}
		if (parent.components.get('grid-layout')) {
			return 'grid-layout'
		}
		return null
	}

	private invalidateParent(): void {
		const parent = this._obj?.parentContainer
		if (!(parent instanceof EditableContainer)) {
			return
		}

		const scene = this._obj?.scene as MainScene | undefined
		const system = scene?.layoutSystem
		system?.invalidate(parent)
	}

	private syncFromState(): void {
		this.horizontal = cloneHorizontalConstraint(this._state.horizontal)
		this.vertical = cloneVerticalConstraint(this._state.vertical)
	}
}

function resolveScalar(scalar: LayoutScalar, parentSize: number): number {
	return scalar.unit === 'percent' ? scalar.value * parentSize : scalar.value
}

type ResizeResult = 'resized' | 'skipped' | 'non-resizable'

function resizeObject(
	obj: EditableObject,
	width: number | undefined,
	height: number | undefined,
	logger: Logger<{}>,
	alreadyWarned: boolean
): ResizeResult {
	if (!obj.isResizable) {
		if (!alreadyWarned && (width !== undefined || height !== undefined)) {
			logger.warn(`Layout stretch cannot resize '${obj.name}'(${obj.id}); object is not resizable.`)
		}
		return 'non-resizable'
	}

	const targetSize = getTargetSize(obj, width, height)
	if (!targetSize) {
		return 'skipped'
	}

	return match(obj)
		.returnType<ResizeResult>()
		.with(P.instanceOf(EditableContainer), (container) => {
			container.setSize(targetSize.width, targetSize.height)
			return 'resized'
		})
		.with(P.instanceOf(EditableNineSlice), (nineSlice) => {
			nineSlice.resize(targetSize.width, targetSize.height)
			return 'resized'
		})
		.with(P.instanceOf(EditableImage), (image) => {
			image.setDisplaySize(targetSize.width, targetSize.height)
			return 'resized'
		})
		.with(P.instanceOf(EditableBitmapText), (bitmapText) => {
			bitmapText.setDisplaySize(targetSize.width, targetSize.height)
			return 'resized'
		})
		.with(P.instanceOf(EditableText), (text) => {
			text.setDisplaySize(targetSize.width, targetSize.height)
			return 'resized'
		})
		.otherwise(() => 'skipped')
}

function getTargetSize(
	obj: EditableObject,
	width: number | undefined,
	height: number | undefined
): { width: number; height: number } | null {
	const current = getCurrentSize(obj)
	const nextWidth = width ?? current.width
	const nextHeight = height ?? current.height

	if (Number.isNaN(nextWidth) || Number.isNaN(nextHeight)) {
		return null
	}

	const widthScale = obj.scaleX || 1
	const heightScale = obj.scaleY || 1

	if (obj instanceof EditableContainer || obj instanceof EditableNineSlice) {
		return {
			width: nextWidth / widthScale,
			height: nextHeight / heightScale,
		}
	}

	return { width: nextWidth, height: nextHeight }
}

function getCurrentSize(obj: EditableObject): { width: number; height: number } {
	if (obj instanceof EditableContainer || obj instanceof EditableNineSlice) {
		return { width: obj.width, height: obj.height }
	}

	return { width: obj.displayWidth, height: obj.displayHeight }
}

function cloneScalar(scalar: LayoutScalar): LayoutScalar {
	return { value: scalar.value, unit: scalar.unit }
}

function cloneHorizontalConstraint(constraint: HorizontalConstraint): HorizontalConstraint {
	switch (constraint.mode) {
		case 'none':
			return { mode: 'none' }
		case 'start':
			return { mode: 'start', start: cloneScalar(constraint.start ?? DEFAULT_SCALAR) }
		case 'center':
			return { mode: 'center', center: cloneScalar(constraint.center ?? DEFAULT_SCALAR) }
		case 'end':
			return { mode: 'end', end: cloneScalar(constraint.end ?? DEFAULT_SCALAR) }
		case 'stretch':
			return {
				mode: 'stretch',
				start: cloneScalar(constraint.start ?? DEFAULT_SCALAR),
				end: cloneScalar(constraint.end ?? DEFAULT_SCALAR),
			}
	}
}

function cloneVerticalConstraint(constraint: VerticalConstraint): VerticalConstraint {
	switch (constraint.mode) {
		case 'none':
			return { mode: 'none' }
		case 'start':
			return { mode: 'start', start: cloneScalar(constraint.start ?? DEFAULT_SCALAR) }
		case 'center':
			return { mode: 'center', center: cloneScalar(constraint.center ?? DEFAULT_SCALAR) }
		case 'end':
			return { mode: 'end', end: cloneScalar(constraint.end ?? DEFAULT_SCALAR) }
		case 'stretch':
			return {
				mode: 'stretch',
				start: cloneScalar(constraint.start ?? DEFAULT_SCALAR),
				end: cloneScalar(constraint.end ?? DEFAULT_SCALAR),
			}
	}
}
