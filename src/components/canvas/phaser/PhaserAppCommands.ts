import { CommandEmitter } from './robowhale/utils/events/CommandEmitter'

/** 
 * Commands to request parent React app to perform some actions 
 */
export type PhaserAppCommands = {
	'double-number': (n: number) => number
}

export type PhaserAppCommandsEmitter = CommandEmitter<PhaserAppCommands>
