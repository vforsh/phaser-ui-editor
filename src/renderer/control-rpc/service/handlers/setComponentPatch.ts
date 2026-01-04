import { P, match } from 'ts-pattern'

import type { setComponentPatchCommand } from '../../api/commands/setComponentPatch'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveNodeSelectorV0 } from '../utils/resolve-node-selector'

/**
 * @see {@link setComponentPatchCommand} for command definition
 */
export const setComponentPatch: CommandHandler<'setComponentPatch'> = (_ctx) => async (params) => {
	const resolved = resolveNodeSelectorV0(params.target)
	if (!resolved.ok) {
		return resolved
	}

	const obj = state.canvas.objectById(resolved.id)
	if (!obj) {
		return {
			ok: false,
			error: { kind: 'validation', message: `object not found for id '${resolved.id}'` },
		}
	}

	const components = obj.components
	if (!Array.isArray(components)) {
		return {
			ok: false,
			error: { kind: 'validation', message: `object '${resolved.id}' does not expose components` },
		}
	}

	const component = match(params.component)
		.with({ id: P.string }, ({ id }) => components.find((entry) => entry.id === id))
		.with({ type: P.string }, ({ type }) => {
			const matches = components.filter((entry) => entry.type === type)
			if (matches.length > 1) {
				return 'duplicate-type'
			}
			return matches[0]
		})
		.exhaustive()

	if (component === 'duplicate-type') {
		return {
			ok: false,
			error: { kind: 'validation', message: 'multiple components match the requested type' },
		}
	}

	if (!component) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'component not found on target object' },
		}
	}

	const patch = params.patch
	if (Object.keys(patch).length === 0) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'patch is empty' },
		}
	}

	Object.entries(patch).forEach(([key, value]) => {
		;(component as Record<string, unknown>)[key] = value
	})

	return { ok: true }
}
