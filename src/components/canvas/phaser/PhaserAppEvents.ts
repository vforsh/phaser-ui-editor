import { TypedEventEmitter } from './robowhale/phaser3/TypedEventEmitter'

// Events to notify parent React app about changes in PhaserApp
export type PhaserAppEvents = {
	test: (message: string) => void
}

export type PhaserAppEventsEmitter = TypedEventEmitter<PhaserAppEvents>
