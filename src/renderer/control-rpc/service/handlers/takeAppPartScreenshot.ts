import path from 'path-browserify-esm'

import type { CommandHandler } from '../types'

import { formatScreenshotTimestamp, sanitizeFileNamePart } from '../../../components/canvas/phaser/scenes/main/mainScene/mainSceneUtils'
import { mainApi } from '../../../main-api/main-api'
import { state } from '../../../state/State'

type CaptureRect = {
	x: number
	y: number
	width: number
	height: number
}

/**
 * @see {@link import('../../api/commands/takeAppPartScreenshot').takeAppPartScreenshotCommand} for command definition
 */
export const takeAppPartScreenshot: CommandHandler<'takeAppPartScreenshot'> = (_ctx) => async (params) => {
	if (!state.projectDir) {
		throw new Error('no project is open')
	}

	let element: Element | null = null
	try {
		element = document.querySelector(params.selector)
	} catch (error) {
		const message = error instanceof Error ? error.message : 'invalid selector'
		throw new Error(message)
	}

	if (!element) {
		throw new Error(`No element found for selector: "${params.selector}"`)
	}

	element.scrollIntoView({ block: 'nearest' })

	const rect = element.getBoundingClientRect()
	const clipped = clipToViewport(rect, window.innerWidth, window.innerHeight)
	if (clipped.width <= 0 || clipped.height <= 0) {
		throw new Error('Element has zero size')
	}

	const captureRect: CaptureRect = {
		x: Math.round(clipped.left + window.scrollX),
		y: Math.round(clipped.top + window.scrollY),
		width: Math.round(clipped.width),
		height: Math.round(clipped.height),
	}

	if (captureRect.width <= 0 || captureRect.height <= 0) {
		throw new Error('Element has zero size')
	}

	const timestamp = formatScreenshotTimestamp(new Date())
	const fileBase = sanitizeFileNamePart(`${timestamp}--app-part`)
	const format = params.format ?? 'png'
	const fileName = `${fileBase}.${format}`
	const targetDir = path.join(state.projectDir, 'screenshots')

	const result = await mainApi.takeAppPartScreenshot({
		targetDir,
		fileName,
		format,
		rect: captureRect,
		quality: params.quality,
	})

	return { path: result.path }
}

function clipToViewport(rect: DOMRect, viewportWidth: number, viewportHeight: number): DOMRect {
	const left = Math.max(rect.left, 0)
	const top = Math.max(rect.top, 0)
	const right = Math.min(rect.right, viewportWidth)
	const bottom = Math.min(rect.bottom, viewportHeight)

	return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top))
}
