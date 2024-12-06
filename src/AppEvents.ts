import { TypedEventEmitter } from './components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'

// Events to notify Phaser app about changes in main app
export type AppEvents = {
	test: (message: string) => void
}

export type AppEventsEmitter = TypedEventEmitter<AppEvents>
