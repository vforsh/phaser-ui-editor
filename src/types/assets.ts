import { match } from 'ts-pattern'
import trpc from '../trpc'
import { imageDataToUrl } from '../utils/image-data-to-url'

export type AssetTreeData = AssetTreeItemData[]

export type AssetTreeItemData =
	| AssetTreeFolderData
	| AssetTreeFileData
	| AssetTreeJsonData
	| AssetTreeXmlData
	| AssetTreeImageData
	| AssetTreePrefabData
	| AssetTreeWebFontData
	| AssetTreeBitmapFontData
	| AssetTreeSpritesheetData
	| AssetTreeSpritesheetFrameData
	| AssetTreeSpritesheetFolderData

export type AssetTreeItemDataType = AssetTreeItemData['type']

export type AssetTreeItemDataOfType<T extends AssetTreeItemDataType> = Extract<AssetTreeItemData, { type: T }>

// Common types
export type AssetTreeFolderData = {
	type: 'folder'
	name: string
	path: string
	children: AssetTreeItemData[]
}

export type AssetTreeFileData = {
	type: 'file'
	name: string
	path: string
}

// Specific types
export type AssetTreeJsonData = {
	type: 'json'
	name: string
	path: string
}

export type AssetTreeXmlData = {
	type: 'xml'
	name: string
	path: string
}

export type AssetTreeImageData = {
	type: 'image'
	name: string
	path: string
	size: { w: number; h: number }
}

export type AssetTreePrefabData = {
	type: 'prefab'
	name: string
	path: string
}

export type AssetTreeWebFontData = {
	type: 'web-font'
	fontFamily: string
	name: string
	path: string
}

export type AssetTreeBitmapFontData = {
	type: 'bitmap-font'
	name: string
	path: string
	image: AssetTreeImageData
	imageExtra?: { atlas: string; texture: string; texturePacker: string }
	data: AssetTreeJsonData | AssetTreeXmlData
}

export type AssetTreeSpritesheetData = {
	type: 'spritesheet'
	name: string
	/**
	 * Absolute path to the image file (e.g. `/Users/user/game/assets/graphics/gameplay_gui.png`)
	 */
	path: string
	image: AssetTreeImageData
	json: AssetTreeJsonData
	frames: (AssetTreeSpritesheetFrameData | AssetTreeSpritesheetFolderData)[]
	/**
	 * Absolute path to the TexturePacker project file (e.g. `/Users/user/game/assets/graphics/gameplay_gui.tps`)
	 */
	project?: string
}

// virtual folder
export type AssetTreeSpritesheetFolderData = {
	type: 'spritesheet-folder'
	name: string
	path: string
	children: AssetTreeSpritesheetFrameData[]
}

export type AssetTreeSpritesheetFrameData = {
	type: 'spritesheet-frame'
	name: string
	/**
	 * Absolute path to the image file (e.g. `/Users/user/game/assets/graphics/gameplay_gui.png`)
	 */
	imagePath: string
	/**
	 * Absolute path to the JSON file (e.g. `/Users/user/game/assets/graphics/gameplay_gui.json`)
	 */
	jsonPath: string
	/**
	 * Absolute path to the frame (e.g. `/Users/user/game/assets/graphics/gameplay_gui.png/pause_screen/button_graphics_quality`)
	 * Used as a key in React
	 */
	path: string
	/**
	 * Path inside of the spritesheet hierarchy (e.g. `pause_screen/button_graphics_quality`)
	 */
	pathInHierarchy: string
	size: { w: number; h: number }
}

export type GraphicAssetData =
	| AssetTreeSpritesheetData
	| AssetTreeSpritesheetFrameData
	| AssetTreeImageData
	| AssetTreeBitmapFontData

export function isGraphicAsset(asset: AssetTreeItemData): asset is GraphicAssetData {
	return match(asset.type)
		.with('image', 'spritesheet', 'spritesheet-frame', 'bitmap-font', () => true)
		.otherwise(() => false)
}

export function isDraggableAsset(assetType: AssetTreeItemDataType): boolean {
	return match(assetType)
		.with('folder', () => false)
		.with('image', () => true)
		.with('json', () => false)
		.with('xml', () => false)
		.with('spritesheet', () => false)
		.with('spritesheet-folder', () => false)
		.with('file', () => false)
		.with('spritesheet-frame', () => true)
		.with('web-font', () => true)
		.with('bitmap-font', () => true)
		.with('prefab', () => true)
		.exhaustive()
}

/**
 * Returns a URL for the image data, that can be used as an img.src
 * TODO return Result
 */
export async function fetchImageUrl(asset: GraphicAssetData, signal?: AbortSignal): Promise<string> {
	const imgData = await fetchImageData(asset, signal)
	const imgUrl = imageDataToUrl(imgData)
	return imgUrl
}

async function fetchImageData(asset: GraphicAssetData, signal?: AbortSignal): Promise<number[]> {
	const res = await match(asset)
		.with({ type: 'image' }, async (image) => {
			return trpc.readFile.query({ path: image.path }, { signal })
		})
		.with({ type: 'spritesheet' }, async (spritesheet) => {
			return trpc.readFile.query({ path: spritesheet.image.path }, { signal })
		})
		.with({ type: 'spritesheet-frame' }, async (spritesheetFrame) => {
			return trpc.readSpritesheetFrame.query(
				{ spritesheetPath: spritesheetFrame.imagePath, frameName: spritesheetFrame.pathInHierarchy },
				{ signal }
			)
		})
		.with({ type: 'bitmap-font' }, async (bitmapFont) => {
			return trpc.readFile.query({ path: bitmapFont.image.path }, { signal })
		})
		.exhaustive()

	return res.data
}

/**
 * Recursively collects all assets of a given type
 */
export function getAssetsOfType<T extends AssetTreeItemDataType>(
	assets: AssetTreeItemData[],
	type: T
): AssetTreeItemDataOfType<T>[] {
	const result: AssetTreeItemDataOfType<T>[] = []

	const collectAssets = (items: AssetTreeItemData[]) => {
		items.forEach((item) => {
			if (isAssetOfType(item, type)) {
				result.push(item)
			}

			if ('children' in item && Array.isArray(item.children)) {
				collectAssets(item.children)
			}
		})
	}

	collectAssets(assets)

	return result
}

export function isAssetOfType<T extends AssetTreeItemDataType>(
	asset: AssetTreeItemData,
	type: T
): asset is AssetTreeItemDataOfType<T> {
	return asset.type === type
}
