import { Selection } from './Selection'
import { getEditableWorldBounds } from './object-bounds'

export type SelectionFrame = {
	width: number
	height: number
	originX: number
	originY: number
	positionX: number
	positionY: number
}

const MIN_SIZE = 1

/**
 * Returns the dimensions/origin/position used to render the selection frame for the current selection.
 *
 * - For multi-selection: uses the aggregated `selection.bounds` + `selection.originX/Y` and `selection.x/y`.
 * - For a single non-container object: uses the object's `displayWidth/Height` and prefers custom origin stored
 *   in data (`originX/originY`) if present.
 * - For a single container: uses bounds of its editable descendants (not necessarily the container's own bounds)
 *   and derives the origin relative to those bounds.
 *
 * When container bounds are degenerate (0 or negative), this falls back to a minimal size and centers origin at 0.5.
 */
export function getSelectionFrame(selection: Selection): SelectionFrame {
	if (selection.count !== 1) {
		return {
			width: selection.bounds.width,
			height: selection.bounds.height,
			originX: selection.originX,
			originY: selection.originY,
			positionX: selection.x,
			positionY: selection.y,
		}
	}

	const obj = selection.objects[0]

	if (obj.kind !== 'Container') {
		const originX = obj.getData('originX') ?? obj.originX
		const originY = obj.getData('originY') ?? obj.originY
		return {
			width: obj.displayWidth,
			height: obj.displayHeight,
			originX,
			originY,
			positionX: obj.x,
			positionY: obj.y,
		}
	}

	const bounds = getEditableWorldBounds(obj)
	let width = bounds.width
	let height = bounds.height

	if (width <= 0 || height <= 0) {
		width = Math.max(width, MIN_SIZE)
		height = Math.max(height, MIN_SIZE)
		return {
			width,
			height,
			originX: 0.5,
			originY: 0.5,
			positionX: obj.x,
			positionY: obj.y,
		}
	}

	const originX = clamp01(safeDiv(obj.x - bounds.left, width))
	const originY = clamp01(safeDiv(obj.y - bounds.top, height))

	return {
		width,
		height,
		originX,
		originY,
		positionX: obj.x,
		positionY: obj.y,
	}
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}

function safeDiv(a: number, b: number): number {
	if (b === 0) {
		return 0
	}

	return a / b
}

