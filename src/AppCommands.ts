import { AlignType } from '@components/canvas/phaser/scenes/main/Aligner'
import { CommandEmitter } from './components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import { EditableObjectJsonBasic } from './components/canvas/phaser/scenes/main/objects/EditableObject'
import { AssetTreeItemData } from './types/assets'

// Commands to request Phaser app to perform some actions
export type AppCommands = {
	'request-hierarchy': () => EditableObjectJsonBasic[]
	'handle-asset-drop': (data: { asset: AssetTreeItemData; position: { x: number; y: number } }) => void
	'align': (type: AlignType) => void
}

export type AppCommandsEmitter = CommandEmitter<AppCommands>
