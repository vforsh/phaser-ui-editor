import { state } from '../../../state/State'
import type { CommandHandler } from '../types'
import { buildHierarchyNode } from '../utils/hierarchy'
import type { listHierarchyCommand } from '../../api/commands/listHierarchy'

/**
 * @see {@link listHierarchyCommand} for command definition
 */
export const listHierarchy: CommandHandler<'listHierarchy'> = (_ctx) => async () => {
	const root = state.canvas.root
	if (!root) {
		throw new Error('no prefab is open')
	}

	return buildHierarchyNode(root)
}
