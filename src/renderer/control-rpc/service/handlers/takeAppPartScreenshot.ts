import type { ImageFormat, ScreenshotOptions } from '@renoun/screenshot'

import { screenshot } from '@renoun/screenshot'
import path from 'path-browserify-esm'

import type { CommandHandler } from '../types'

import { formatScreenshotTimestamp, sanitizeFileNamePart } from '../../../components/canvas/phaser/scenes/main/mainScene/mainSceneUtils'
import { mainApi } from '../../../main-api/main-api'
import { state } from '../../../state/State'
import { ControlOperationalError } from '../../control-errors'
import { ERR_ELEMENT_NOT_FOUND, ERR_INVALID_SELECTOR, ERR_NO_PROJECT_OPEN, ERR_ZERO_SIZE } from '../../jsonrpc-errors'

/**
 * @see {@link import('../../api/commands/takeAppPartScreenshot').takeAppPartScreenshotCommand} for command definition
 */
export const takeAppPartScreenshot: CommandHandler<'takeAppPartScreenshot'> = (_ctx) => async (params) => {
	if (!state.projectDir) {
		throw new ControlOperationalError({
			code: ERR_NO_PROJECT_OPEN,
			reason: 'no_project_open',
			message: 'no project is open',
		})
	}

	let element: Element | null = null
	try {
		element = document.querySelector(params.selector)
	} catch (error) {
		const message = error instanceof Error ? error.message : 'invalid selector'
		throw new ControlOperationalError({
			code: ERR_INVALID_SELECTOR,
			reason: 'invalid_selector',
			message,
		})
	}

	if (!element) {
		throw new ControlOperationalError({
			code: ERR_ELEMENT_NOT_FOUND,
			reason: 'selector_not_found',
			message: `No element found for selector: "${params.selector}"`,
		})
	}

	element.scrollIntoView({ block: 'nearest' })

	const rect = element.getBoundingClientRect()
	const shouldClipToViewport = params.clipToViewport !== false
	const clipped = shouldClipToViewport ? clipToViewport(rect, window.innerWidth, window.innerHeight) : rect
	if (clipped.width <= 0 || clipped.height <= 0) {
		throw new ControlOperationalError({
			code: ERR_ZERO_SIZE,
			reason: 'zero_size',
			message: 'Element has zero size',
		})
	}

	const timestamp = formatScreenshotTimestamp(new Date())
	const fileBase = sanitizeFileNamePart(`${timestamp}--app-part`)
	const format = params.format ?? 'png'
	const fileName = `${fileBase}.${format}`
	const targetDir = path.join(state.projectDir, 'screenshots')
	const includeFixed = params.includeFixed ?? 'intersecting'
	const quality = normalizeRenounQuality(params.quality)

	const crop = buildRenounCrop(rect, clipped, shouldClipToViewport)
	const renounFormat: ImageFormat = format === 'jpg' ? 'jpeg' : format
	const screenshotOptions: ScreenshotOptions = {
		format: renounFormat,
		quality,
		includeFixed,
		scale: params.scale,
		backgroundColor: params.backgroundColor,
	}
	if (crop) {
		Object.assign(screenshotOptions, crop)
	}

	const blob = await screenshot.blob(element, screenshotOptions)
	const bytes = new Uint8Array(await blob.arrayBuffer())
	const result = await mainApi.saveScreenshot({ targetDir, fileName, bytes })
	return { path: result.path }
}

function clipToViewport(rect: DOMRect, viewportWidth: number, viewportHeight: number): DOMRect {
	const left = Math.max(rect.left, 0)
	const top = Math.max(rect.top, 0)
	const right = Math.min(rect.right, viewportWidth)
	const bottom = Math.min(rect.bottom, viewportHeight)

	return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top))
}

function buildRenounCrop(rect: DOMRect, clipped: DOMRect, clippedToViewport: boolean) {
	if (!clippedToViewport) {
		return undefined
	}

	return {
		x: clipped.left - rect.left,
		y: clipped.top - rect.top,
		width: clipped.width,
		height: clipped.height,
	}
}

function normalizeRenounQuality(quality?: number): number | undefined {
	if (quality === undefined || Number.isNaN(quality)) {
		return undefined
	}

	const normalized = quality > 1 ? quality / 100 : quality
	return Math.min(1, Math.max(0, normalized))
}
