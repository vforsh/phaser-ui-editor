import type { addObjectComponentCommand } from '@tekton/control-rpc-contract/commands/addObjectComponent'

import { EditableComponentType } from '@components/canvas/phaser/scenes/main/objects/components/base/EditableComponent'

import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveObjectSelectorV0 } from '../utils/resolve-object-selector'

const RESERVED_COMPONENT_KEYS = new Set(['type', 'id'])

/**
 * @see {@link addObjectComponentCommand} for command definition
 */
export const addObjectComponent: CommandHandler<'addObjectComponent'> = (ctx) => async (params) => {
	const resolved = resolveObjectSelectorV0(params.target)
	if (!resolved.ok) {
		return resolved
	}

	const type = params.componentJson?.type
	if (typeof type !== 'string' || type.trim().length === 0) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'componentJson.type is required' },
		}
	}

	const result = ctx.appCommands.emit('add-component', {
		componentType: type as EditableComponentType,
		objectId: resolved.id,
	})

	if (!result) {
		return {
			ok: false,
			error: { kind: 'internal', message: 'add-component returned no result' },
		}
	}

	if (result.isErr()) {
		return {
			ok: false,
			error: { kind: 'validation', message: result.error },
		}
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

	const matches = components.filter((entry) => entry.type === type)
	if (matches.length > 1) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'multiple components match the requested type' },
		}
	}

	const component = matches[0]
	if (!component) {
		return {
			ok: false,
			error: {
				kind: 'internal',
				message: 'component add succeeded but component not present in state',
			},
		}
	}

	const patchEntries = Object.entries(params.componentJson).filter(([key]) => !RESERVED_COMPONENT_KEYS.has(key))
	if (patchEntries.length > 0) {
		patchEntries.forEach(([key, value]) => {
			;(component as Record<string, unknown>)[key] = value
		})
	}

	return { ok: true }
}
