import { EditableContainerJson } from '../../components/canvas/phaser/scenes/main/objects/EditableContainer'

export type PrefabFile = {
	content: EditableContainerJson | undefined

	/**
	 * Used in the runtime to load the assets before displaying the prefab.
	 */
	assetPack: Phaser.Types.Loader.FileTypes.PackFileSection[]
}
