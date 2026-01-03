import { state } from '../../../state/State'
import type { CommandHandler } from '../types'
import type { getSelectedAssetsCommand } from '../../api/commands/getSelectedAssets'

/**
 * @see {@link getSelectedAssetsCommand} for command definition
 */
export const getSelectedAssets: CommandHandler<'getSelectedAssets'> = (_ctx) => async () => {
	return { ids: [...state.assets.selection] }
}
