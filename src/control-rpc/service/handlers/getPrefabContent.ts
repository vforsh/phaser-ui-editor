import { state, unproxy } from '../../../state/State'
import type { CommandHandler } from '../types'
import type { getPrefabContentCommand } from '../../api/commands/getPrefabContent'

/**
 * @see {@link getPrefabContentCommand} for command definition
 */
export const getPrefabContent: CommandHandler<'getPrefabContent'> = (_ctx) => async () => {
	const root = state.canvas.root
	if (!root) {
		throw new Error('no prefab is open')
	}

	return unproxy(root)
}
