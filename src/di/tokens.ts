import { InjectionToken } from 'tsyringe'

import { AppCommands } from '../AppCommands'
import { AppEvents } from '../AppEvents'
import { PhaserAppCommands } from '../components/canvas/phaser/PhaserAppCommands'
import { PhaserAppEvents } from '../components/canvas/phaser/PhaserAppEvents'
import { TypedEventEmitter } from '../components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from '../components/canvas/phaser/robowhale/utils/events/CommandEmitter'

export type PhaserScope = {
	events: TypedEventEmitter<PhaserAppEvents> | null
	commands: CommandEmitter<PhaserAppCommands> | null
}

export const TOKENS = {
	AppEvents: Symbol('AppEvents') as InjectionToken<TypedEventEmitter<AppEvents>>,
	AppCommands: Symbol('AppCommands') as InjectionToken<CommandEmitter<AppCommands>>,
	PhaserScope: Symbol('PhaserScope') as InjectionToken<PhaserScope>,
}

