import type { getPrefabDocumentCommand } from '../../api/commands/getPrefabDocument'
import type { CommandHandler } from '../types'

import { state, unproxy } from '../../../state/State'

/**
 * @see {@link getPrefabDocumentCommand} for command definition
 */
export const getPrefabDocument: CommandHandler<'getPrefabDocument'> = (_ctx) => async () => {
	const root = state.canvas.root
	if (!root) {
		throw new Error('no prefab is open')
	}

	return { kind: 'expanded', content: unproxy(root) }
}
