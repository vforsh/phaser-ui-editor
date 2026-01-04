import { match } from 'ts-pattern'
import type { ILogObj, Logger } from 'tslog'
import type { ReadonlyDeep } from 'type-fest'
import arrowsHorizontalCursor from '../cursors/arrows-horizontal.svg?raw'
import arrowsLeftDownCursor from '../cursors/arrows-left-down.svg?raw'
import type { Selection } from '../Selection'

export type Events = {
	'start-follow': (selection: Selection) => void
	'stop-follow': (selectionContent: string) => void
	'transform-start': (type: TransformType) => void
	'transform-end': (type: TransformType) => void
}

export type TransformType = 'rotate' | 'resize' | 'origin'

export type ResizeDirection = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export const MIN_DISPLAY_SIZE = 16

export interface TransformControlOptions {
	logger: Logger<ILogObj>
	resizeBorders: {
		thickness: number
		color: number
		hitAreaPadding: number
	}
	resizeKnobs: {
		// width and height of the knob texture
		fillSize: number
		fillColor: number
		resolution: number
	}
	rotateKnobs: {
		radius: number
	}
	originKnob: {
		radius: number
		lineColor: number
		lineThickness: number
		resolution: number
	}
}

export type ReadonlyTransformControlOptions = ReadonlyDeep<TransformControlOptions>

/**
 * Resolve resize direction based on rotated pointer delta.
 */
export function getResizeDirectionFromRotatedDelta(rotatedX: number, rotatedY: number): ResizeDirection {
	if (rotatedX < 0 && rotatedY < 0) return 'top-left'
	if (rotatedX < 0 && rotatedY > 0) return 'bottom-left'
	if (rotatedX > 0 && rotatedY < 0) return 'top-right'
	if (rotatedX > 0 && rotatedY > 0) return 'bottom-right'
	throw new Error(`Invalid knob position: ${rotatedX}, ${rotatedY}`)
}

/**
 * Map resize direction to the origin pivot used during resize.
 */
export function getOriginForResizeDirection(direction: ResizeDirection): readonly [number, number] {
	return match(direction)
		.with('top-left', () => [1, 1] as const)
		.with('top-right', () => [0, 1] as const)
		.with('bottom-left', () => [1, 0] as const)
		.with('bottom-right', () => [0, 0] as const)
		.exhaustive()
}

/**
 * Get cursor angle offset for a resize knob by name.
 */
export function getResizeCursorAngleOffsetByName(name: string): number {
	return match(name)
		.with('top-left-resize-knob', () => 0)
		.with('top-right-resize-knob', () => 90)
		.with('bottom-left-resize-knob', () => 270)
		.with('bottom-right-resize-knob', () => 180)
		.run()
}

/**
 * Get cursor angle offset for a rotate knob by name.
 */
export function getRotateCursorAngleOffsetByName(name: string): number {
	return match(name)
		.with('top-right-rotate-knob', () => 0)
		.with('bottom-right-rotate-knob', () => 90)
		.with('bottom-left-rotate-knob', () => 180)
		.with('top-left-rotate-knob', () => 270)
		.run()
}

export class CursorManager {
	private readonly defaultCursor = 'default'

	/**
	 * Set resize cursor rotated to the given angle.
	 */
	setResizeCursor(angleDeg: number): void {
		const cursor = this.buildCursor(arrowsHorizontalCursor, angleDeg)
		document.body.style.cursor = cursor
	}

	/**
	 * Set rotate cursor rotated to the given angle.
	 */
	setRotateCursor(angleDeg: number): void {
		const cursor = this.buildCursor(arrowsLeftDownCursor, angleDeg)
		document.body.style.cursor = cursor
	}

	/**
	 * Restore default cursor.
	 */
	setDefaultCursor(): void {
		document.body.style.cursor = this.defaultCursor
	}

	private buildCursor(svgRaw: string, angleDeg: number): string {
		const rotatedSvg = svgRaw.replace('<svg', `<svg style="transform: rotate(${angleDeg}deg)"`)
		const dataUri = encodeURIComponent(rotatedSvg)
		return `url("data:image/svg+xml,${dataUri}") 12 12, pointer`
	}
}
