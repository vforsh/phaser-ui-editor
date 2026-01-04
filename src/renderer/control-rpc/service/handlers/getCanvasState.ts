import type { getCanvasStateCommand } from '../../api/commands/getCanvasState'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'

/**
 * @see {@link getCanvasStateCommand} for command definition
 */
export const getCanvasState: CommandHandler<'getCanvasState'> = (_ctx) => async () => ({
	currentPrefab: state.canvas.currentPrefab,
	activeContextId: state.canvas.activeContextId,
	selectionIds: state.canvas.selection,
	hasUnsavedChanges: state.canvas.hasUnsavedChanges,
	camera: state.canvas.camera,
})
