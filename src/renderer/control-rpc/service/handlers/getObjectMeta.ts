import type { getObjectMetaCommand } from '../../api/commands/getObjectMeta'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveObjectSelectorV0 } from '../utils/resolve-object-selector'

/**
 * @see {@link getObjectMetaCommand} for command definition
 */
export const getObjectMeta: CommandHandler<'getObjectMeta'> = (_ctx) => async (params) => {
	const resolved = resolveObjectSelectorV0(params.target)
	if (!resolved.ok) {
		throw new Error(resolved.error.message)
	}

	const obj = state.canvas.objectById(resolved.id)
	if (!obj) {
		throw new Error(`object not found for id '${resolved.id}'`)
	}

	return {
		id: obj.id,
		name: obj.name,
		type: obj.type,
		path: resolved.path,
	}
}
