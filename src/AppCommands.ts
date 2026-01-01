import { AlignType } from '@components/canvas/phaser/scenes/main/Aligner'
import {
	AddComponentResult,
	MoveComponentResult,
	RemoveComponentResult,
} from '@components/canvas/phaser/scenes/main/objects/components/base/ComponentsManager'
import {
	EditableComponentJson,
	EditableComponentType,
} from '@components/canvas/phaser/scenes/main/objects/components/base/EditableComponent'
import { EditableObjectType } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { CommandEmitter } from './components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import { AssetTreeItemData } from './types/assets'

/**
 * Commands to request Phaser app to perform some actions
 */
export type AppCommands = {
	// commands from hierarchy panel
	'switch-to-context': (id: string) => void
	'highlight-object': (id: string) => void
	'create-object': (data: { clickedObjId: string; type: EditableObjectType }) => void
	'copy-object': (id: string) => void
	'duplicate-object': (id: string) => void
	'cut-object': (id: string) => void
	'paste-object': (id: string) => void
	'delete-objects': (ids: string[]) => void
	'move-object-in-hierarchy': (id: string, parentId: string, parentIndex: number) => void
	'get-object-path': (id: string) => string
	'save-prefab': () => void
	'discard-unsaved-prefab': () => void

	'select-object': (id: string) => void
	'select-objects': (ids: string[]) => void
	'add-object-to-selection': (id: string) => void
	'remove-object-from-selection': (id: string) => void
	'clear-selection': () => void

	// commands from assets panel
	'open-prefab': (prefabAssetId: string) => void
	'handle-asset-drop': (data: { asset: AssetTreeItemData; position: { x: number; y: number } }) => void

	// commands from align controls
	'align': (type: AlignType) => void

	// commands from inspector panel
	'add-component': (data: { componentType: EditableComponentType; objectId: string }) => AddComponentResult
	'remove-component': (data: { componentType: EditableComponentType; objectId: string }) => RemoveComponentResult
	'move-component-up': (data: { componentType: EditableComponentType; objectId: string }) => MoveComponentResult
	'move-component-down': (data: { componentType: EditableComponentType; objectId: string }) => MoveComponentResult
	'paste-component': (data: { componentData: EditableComponentJson; objectId: string }) => AddComponentResult
	'reset-image-original-size': (data: { objectId: string }) => void
	'adjust-container-to-children-bounds': (data: { objectId: string }) => void

	// history
	undo: () => void
	redo: () => void
}

export type AppCommandsEmitter = CommandEmitter<AppCommands>
