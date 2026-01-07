import type { removeObjectComponentCommand } from '@tekton/control-rpc-contract/commands/removeObjectComponent'

import { EditableComponentType } from '@components/canvas/phaser/scenes/main/objects/components/base/EditableComponent'
import { P, match } from 'ts-pattern'

import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveObjectSelectorV0 } from '../utils/resolve-object-selector'

/**
 * @see {@link removeObjectComponentCommand} for command definition
 */
export const removeObjectComponent: CommandHandler<'removeObjectComponent'> = (ctx) => async (params) => {
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

	const components = obj.components
	if (!Array.isArray(components)) {
		return {
			ok: false,
			error: { kind: 'validation', message: `object '${resolved.id}' does not expose components` },
		}
	}

	const type = match(params.component)
		.with({ type: P.string }, ({ type }) => {
			const matches = components.filter((entry) => entry.type === type)
			if (matches.length > 1) {
				return 'duplicate-type'
			}
			if (matches.length === 0) {
				return undefined
			}
			return matches[0]?.type
		})
		.with({ id: P.string }, ({ id }) => components.find((entry) => entry.id === id)?.type)
		.exhaustive()

	if (type === 'duplicate-type') {
		return {
			ok: false,
			error: { kind: 'validation', message: 'multiple components match the requested type' },
		}
	}

	if (!type) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'component not found on target object' },
		}
	}

	const result = ctx.appCommands.emit('remove-component', {
		componentType: type as EditableComponentType,
		objectId: resolved.id,
	})

	if (!result) {
		return {
			ok: false,
			error: { kind: 'internal', message: 'remove-component returned no result' },
		}
	}

	if (result.isErr()) {
		return {
			ok: false,
			error: { kind: 'validation', message: result.error },
		}
	}

	return { ok: true }
}
