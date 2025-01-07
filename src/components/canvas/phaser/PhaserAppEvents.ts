import { TypedEventEmitter } from './robowhale/phaser3/TypedEventEmitter'
import { EditableObjectJsonBasic } from './scenes/main/objects/EditableObject'

// Events to notify parent React app about changes in PhaserApp
export type PhaserAppEvents = {
	'hierarchy-changed': (hierarchy: EditableObjectJsonBasic) => void
	'selection-changed': (selectedObjectsIds: string[]) => void
	'hover-changed': (hoveredObjectsIds: string[]) => void
}

export type PhaserAppEventsEmitter = TypedEventEmitter<PhaserAppEvents>
