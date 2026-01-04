import { P, match } from 'ts-pattern'
import { state, unproxy } from '../../../state/State'
import type { getObjectCommand } from '../../api/commands/getObject'
import type { ControlInput } from '../../api/ControlApi'
import type { CommandHandler } from '../types'
import { resolveObjectIdByPath } from '../utils/object-path'

/**
 * @see {@link getObjectCommand} for command definition
 */
export const getObject: CommandHandler<'getObject'> = (_ctx) => async (params) => {
	const resolved = resolveObjectRef(params)
	const obj = state.canvas.objectById(resolved.id)
	if (!obj) {
		if (resolved.path) {
			throw new Error(`object not found for path '${resolved.path}'`)
		}
		throw new Error(`object not found for id '${resolved.id}'`)
	}

	return unproxy(obj)
}

type ResolvedObjectRef = {
	id: string
	path?: string
}

function resolveObjectRef(params: ControlInput<'getObject'>): ResolvedObjectRef {
	return match(params)
		.with({ id: P.string }, ({ id }) => ({ id }))
		.with({ path: P.string }, ({ path }) => {
			const root = state.canvas.root
			if (!root) {
				throw new Error('no prefab is open')
			}
			const resolvedId = resolveObjectIdByPath(root, path)
			if (!resolvedId) {
				throw new Error(`object not found for path '${path}'`)
			}
			return { id: resolvedId, path }
		})
		.exhaustive()
}
