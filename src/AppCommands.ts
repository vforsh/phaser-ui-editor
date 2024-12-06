import { CommandEmitter } from './components/canvas/phaser/robowhale/utils/events/CommandEmitter'

// Commands to request Phaser app to perform some actions
export type AppCommands = {
	'double-number': (n: number) => number
}

export type AppCommandsEmitter = CommandEmitter<AppCommands>
