import { TypedEventEmitter } from './robowhale/phaser3/TypedEventEmitter'
import { EditableObjectJsonBasic } from './scenes/main/objects/EditableObject'

// Events to notify parent React app about changes in PhaserApp
export type PhaserAppEvents = {
	'hierarchy-changed': (hierarchy: EditableObjectJsonBasic) => void
}

export type PhaserAppEventsEmitter = TypedEventEmitter<PhaserAppEvents>
