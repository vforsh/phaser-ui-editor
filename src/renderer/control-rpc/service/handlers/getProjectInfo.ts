import type { getProjectInfoCommand } from '../../api/commands/getProjectInfo'
import type { CommandHandler } from '../types'

import { state, unproxy } from '../../../state/State'

/**
 * @see {@link getProjectInfoCommand} for command definition
 */
export const getProjectInfo: CommandHandler<'getProjectInfo'> = (_ctx) => async () => {
	if (!state.project || !state.projectDir) {
		throw new Error('no project is open')
	}

	return {
		...unproxy(state.project),
		path: state.projectDir,
	}
}
