import { CanvasDocumentJson } from './PrefabDocument'

export type PrefabFile = {
	content: CanvasDocumentJson | null

	/**
	 * Used in the runtime to load the assets before displaying the prefab.
	 */
	assetPack: Phaser.Types.Loader.FileTypes.PackFileSection[]
}

export function createEmptyPrefabFile(): PrefabFile {
	return {
		content: null,
		assetPack: [],
	}
}
