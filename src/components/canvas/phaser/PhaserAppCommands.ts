import { CommandEmitter } from './robowhale/utils/events/CommandEmitter'

/**
 * Commands to request parent React app to perform some actions
 */
export type PhaserAppCommands = {
	'prompt-prefab-save': (data: { prefabName: string }) => Promise<'save' | 'dont-save' | 'cancel'>
}

export type PhaserAppCommandsEmitter = CommandEmitter<PhaserAppCommands>
