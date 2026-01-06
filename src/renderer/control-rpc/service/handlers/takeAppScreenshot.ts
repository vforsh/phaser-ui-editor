import path from 'path-browserify-esm'

import type { CommandHandler } from '../types'

import { formatScreenshotTimestamp, sanitizeFileNamePart } from '../../../components/canvas/phaser/scenes/main/mainScene/mainSceneUtils'
import { mainApi } from '../../../main-api/main-api'
import { state } from '../../../state/State'

/**
 * @see {@link import('../../api/commands/takeAppScreenshot').takeAppScreenshotCommand} for command definition
 */
export const takeAppScreenshot: CommandHandler<'takeAppScreenshot'> = (_ctx) => async (params) => {
	if (!state.projectDir) {
		throw new Error('no project is open')
	}

	const timestamp = formatScreenshotTimestamp(new Date())
	const fileBase = sanitizeFileNamePart(`${timestamp}--app`)
	const format = params.format ?? 'png'
	const fileName = `${fileBase}.${format}`
	const targetDir = path.join(state.projectDir, 'screenshots')

	const result = await mainApi.takeAppScreenshot({
		targetDir,
		fileName,
		format,
	})

	return { path: result.path }
}
