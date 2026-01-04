import type { NodeSelectorV0 } from '../../api/shared-schemas'

import { state } from '../../../state/State'
import { resolveObjectIdByPath } from './object-path'

export type ResolveNodeSelectorV0Result =
	| { ok: true; id: string; path?: string }
	| { ok: false; error: { kind: 'validation'; message: string } }

export function resolveNodeSelectorV0(selector: NodeSelectorV0): ResolveNodeSelectorV0Result {
	if ('id' in selector) {
		return { ok: true, id: selector.id }
	}

	const root = state.canvas.root
	if (!root) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'no prefab is open' },
		}
	}

	const resolvedId = resolveObjectIdByPath(root, selector.path)
	if (!resolvedId) {
		return {
			ok: false,
			error: { kind: 'validation', message: `object not found for path '${selector.path}'` },
		}
	}

	return { ok: true, id: resolvedId, path: selector.path }
}
