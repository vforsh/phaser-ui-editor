import { InjectionToken } from '@needle-di/core'

import { AppCommands } from '../AppCommands'
import { AppEvents } from '../AppEvents'
import { PhaserAppCommands } from '../components/canvas/phaser/PhaserAppCommands'
import { PhaserAppEvents } from '../components/canvas/phaser/PhaserAppEvents'
import { TypedEventEmitter } from '../components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from '../components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import { UndoHub } from '../history/UndoHub'
import { ModalService } from '../modals/ModalService'

export type PhaserScope = {
	events: TypedEventEmitter<PhaserAppEvents> | null
	commands: CommandEmitter<PhaserAppCommands> | null
}

export const TOKENS = {
	AppEvents: new InjectionToken<TypedEventEmitter<AppEvents>>('AppEvents'),
	AppCommands: new InjectionToken<CommandEmitter<AppCommands>>('AppCommands'),
	PhaserScope: new InjectionToken<PhaserScope>('PhaserScope'),
	UndoHub: new InjectionToken<UndoHub>('UndoHub'),
	ModalService: new InjectionToken<ModalService>('ModalService'),
}
