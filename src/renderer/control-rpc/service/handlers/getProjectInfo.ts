import { state, unproxy } from '../../../state/State'
import type { getProjectInfoCommand } from '../../api/commands/getProjectInfo'
import type { CommandHandler } from '../types'

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
