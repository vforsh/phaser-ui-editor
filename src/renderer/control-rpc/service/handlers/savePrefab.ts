import type { savePrefabCommand } from '@tekton/control-rpc-contract/commands/savePrefab'

import type { CommandHandler } from '../types'

import { state } from '../../../state/State'

/**
 * @see {@link savePrefabCommand} for command definition
 */
export const savePrefab: CommandHandler<'savePrefab'> = (ctx) => async () => {
	if (!state.canvas.currentPrefab) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'no prefab is open' },
		}
	}

	ctx.appCommands.emit('save-prefab')
	return { ok: true }
}
