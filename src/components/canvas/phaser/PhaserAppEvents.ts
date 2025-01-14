import { TypedEventEmitter } from './robowhale/phaser3/TypedEventEmitter'
import { EditableObjectJson } from './scenes/main/objects/EditableObject'

// Events to notify parent React app about changes in PhaserApp
export type PhaserAppEvents = {
	// to notify hierarchy panel about selection changes
	'selection-changed': (selectedObjectsIds: string[]) => void
	// to notify hierarchy panel about hover changes
	'hover-changed': (hoveredObjectsIds: string[]) => void
	
	// to notify inspector panel about selection changes
	'selected-object-changed': (selectedObject: EditableObjectJson | null) => void
}

export type PhaserAppEventsEmitter = TypedEventEmitter<PhaserAppEvents>
