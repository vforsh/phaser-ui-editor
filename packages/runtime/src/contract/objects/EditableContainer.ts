import type { EditableComponentJson } from '../components/EditableComponent'
import type { CreateEditableObjectJson, EditableObjectJson } from './EditableObject'

export type PrefabRef = {
	id: string
	name: string
}

export type EditableContainerJson = CreateEditableObjectJson<{
	type: 'Container'
	id: string
	children: EditableObjectJson[]
	name: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	locked: boolean
	angle: number
	originX: number
	originY: number
	width: number
	height: number
	displayWidth: number
	displayHeight: number
	components: EditableComponentJson[]

	/**
	 * If the container was created from a prefab, this will be the reference to the prefab.
	 */
	prefab: PrefabRef | null
}>
