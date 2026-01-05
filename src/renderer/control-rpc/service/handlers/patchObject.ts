import type { patchObjectCommand } from '../../api/commands/patchObject'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { applyWhitelistedPatch } from '../utils/apply-whitelisted-patch'
import { resolveObjectSelectorV0 } from '../utils/resolve-object-selector'

/**
 * @see {@link patchObjectCommand} for command definition
 */
export const patchObject: CommandHandler<'setObjectPatch'> = (_ctx) => async (params) => {
	const resolved = resolveObjectSelectorV0(params.target)
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

	const patch = params.patch
	const { applied } = applyWhitelistedPatch(obj as Record<string, unknown>, patch)
	if (applied === 0 && Object.keys(patch).length > 0) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'patch did not apply any whitelisted fields' },
		}
	}

	return { ok: true }
}
