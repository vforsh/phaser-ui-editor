import type { getPrefabDocumentCommand } from '@tekton/control-rpc-contract/commands/getPrefabDocument'

import type { CommandHandler } from '../types'

/**
 * @see {@link getPrefabDocumentCommand} for command definition
 */
export const getPrefabDocument: CommandHandler<'getPrefabDocument'> = (ctx) => async () => {
	const doc = ctx.appCommands.emit('get-prefab-document')
	if (!doc) {
		throw new Error('no prefab is open')
	}

	return doc
}
