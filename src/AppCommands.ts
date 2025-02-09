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
import { CommandEmitter } from './components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import { AssetTreeItemData } from './types/assets'

/**
 * Commands to request Phaser app to perform some actions
 */
export type AppCommands = {
	// commands from hierarchy panel
	'delete-object': (objPath: string) => void

	// commands from assets panel
	'handle-asset-drop': (data: { asset: AssetTreeItemData; position: { x: number; y: number } }) => void

	// commands from align controls
	'align': (type: AlignType) => void

	// commands from inspector panel
	'add-component': (data: { componentType: EditableComponentType; objectId: string }) => AddComponentResult
	'remove-component': (data: { componentType: EditableComponentType; objectId: string }) => RemoveComponentResult
	'move-component-up': (data: { componentType: EditableComponentType; objectId: string }) => MoveComponentResult
	'move-component-down': (data: { componentType: EditableComponentType; objectId: string }) => MoveComponentResult
	'paste-component': (data: { componentData: EditableComponentJson; objectId: string }) => AddComponentResult
}

export type AppCommandsEmitter = CommandEmitter<AppCommands>
