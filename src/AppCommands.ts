import { AlignType } from '@components/canvas/phaser/scenes/main/Aligner'
import { CommandEmitter } from './components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import { AssetTreeItemData } from './types/assets'

/**
 * Commands to request Phaser app to perform some actions
 */
export type AppCommands = {
	// commands from hierarchy panel
	'delete-object': (objPath: string) => void

	// commands from assets panel
	'handle-asset-drop': (data: { asset: AssetTreeItemData; position: { x: number; y: number } }) => void

	// commands from align controls
	'align': (type: AlignType) => void
}

export type AppCommandsEmitter = CommandEmitter<AppCommands>
