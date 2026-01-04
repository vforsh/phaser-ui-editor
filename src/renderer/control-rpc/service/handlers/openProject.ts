import type { openProjectCommand } from '../../api/commands/openProject'
import type { CommandHandler } from '../types'

import { openProjectByPath } from '../../../project/open-project'

/**
 * @see {@link openProjectCommand} for command definition
 */
export const openProject: CommandHandler<'openProject'> = (_ctx) => async (params) => {
	if (!params.path) {
		throw new Error('openProject requires a path')
	}

	const opened = await openProjectByPath(params.path)
	if (!opened) {
		throw new Error(`failed to open project at '${params.path}'`)
	}

	return { success: true }
}
