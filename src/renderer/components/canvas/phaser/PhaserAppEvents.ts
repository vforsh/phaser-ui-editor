import type { EditableObjectJson } from '@tekton/runtime'

import { TypedEventEmitter } from './robowhale/phaser3/TypedEventEmitter'

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
