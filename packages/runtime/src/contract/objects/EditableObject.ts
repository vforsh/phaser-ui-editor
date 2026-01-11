import type { EditableComponentJson } from '../components/EditableComponent'
import type { EditableBitmapTextJson } from './EditableBitmapText'
import type { EditableContainerJson } from './EditableContainer'
import type { EditableGraphicsJson } from './EditableGraphics'
import type { EditableImageJson } from './EditableImage'
import type { EditableNineSliceJson } from './EditableNineSlice'
import type { EditableTextJson } from './EditableText'

export type CreateEditableObjectJson<T extends { readonly type: string; locked: boolean; components: EditableComponentJson[] }> =
	Phaser.Types.GameObjects.JSONGameObject & T & { localId?: string }

export type EditableObjectJson =
	| EditableContainerJson
	| EditableImageJson
	| EditableNineSliceJson
	| EditableTextJson
	| EditableBitmapTextJson
	| EditableGraphicsJson

export type EditableObjectJsonType = EditableObjectJson['type']
