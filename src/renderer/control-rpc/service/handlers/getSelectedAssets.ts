import { state } from '../../../state/State'
import type { getSelectedAssetsCommand } from '../../api/commands/getSelectedAssets'
import type { CommandHandler } from '../types'

/**
 * @see {@link getSelectedAssetsCommand} for command definition
 */
export const getSelectedAssets: CommandHandler<'getSelectedAssets'> = (_ctx) => async () => {
	return { ids: [...state.assets.selection] }
}
