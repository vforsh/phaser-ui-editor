import { state } from '@state/State'
import path from 'path-browserify-esm'
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

export type AssetTreeFolderData = {
	type: 'folder'
	id: string
	name: string
	path: string
	children: AssetTreeItemData[]
}

export type AssetTreeFileData = {
	type: 'file'
	id: string
	name: string
	path: string
}

export type AssetTreeJsonData = {
	type: 'json'
	id: string
	name: string
	path: string
}

export type AssetTreeXmlData = {
	type: 'xml'
	id: string
	name: string
	path: string
}

export type AssetTreeImageData = {
	type: 'image'
	id: string
	name: string
	path: string
	size: { w: number; h: number }
	scale9Borders?: {
		x: number
		y: number
		w: number
		h: number
	}
}

export type AssetTreePrefabData = {
	type: 'prefab'
	id: string
	name: string
	path: string
}

export type AssetTreeWebFontData = {
	type: 'web-font'
	id: string
	fontFamily: string
	name: string
	path: string
}

export type AssetTreeBitmapFontData = {
	type: 'bitmap-font'
	id: string
	name: string
	/**
	 * Absolute path to the bitmap font data file (JSON or XML)
	 * (e.g. `/Users/user/game/assets/fonts/arial.json` or `/Users/user/game/assets/fonts/arial.xml`)
	 * @note The image file path is stored in the `image` property
	 */
	path: string
	image: AssetTreeImageData
	/**
	 * Additional image metadata from the bitmap font data file.
	 * **Only present when the font texture is a part of a spritesheet.**
	 *
	 * - atlas: Path to the spritesheet JSON file
	 * - texture: Path to the spritesheet image file
	 * - texturePacker: Path to the TexturePacker project file (e.g. `.tps`)
	 */
	imageExtra?: {
		atlas: string
		texture: string
		texturePacker: string
	}
	data: AssetTreeJsonData | AssetTreeXmlData
}

export type AssetTreeSpritesheetData = {
	type: 'spritesheet'
	id: string
	name: string
	/**
	 * Absolute path to the spritesheet texture file
	 * (e.g. `/Users/user/game/assets/graphics/gameplay_gui.png`)
	 * @note The json file path is stored in the `json` property
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

export type AssetTreeSpritesheetFolderData = {
	type: 'spritesheet-folder'
	id: string
	name: string
	/**
	 * Virtual path that combines the spritesheet image path and the folder path
	 * (e.g. `/Users/user/game/assets/graphics/gameplay_gui.png/pause_screen`)
	 *
	 * Note: This is a virtual path that can be used for React keys and hierarchy representation.
	 * It **does not** correspond to an actual file on disk.
	 */
	path: string
	children: AssetTreeSpritesheetFrameData[]
	/**
	 * Absolute path to the TexturePacker project file (e.g. `/Users/user/game/assets/graphics/gameplay_gui.tps`)
	 */
	project?: string
}

export type AssetTreeSpritesheetFrameData = {
	type: 'spritesheet-frame'
	id: string
	name: string
	/**
	 * Absolute path to the spritesheet image file
	 * (e.g. `/Users/user/game/assets/graphics/gameplay_gui.png`)
	 */
	imagePath: string
	/**
	 * Absolute path to the spritesheet JSON file
	 * (e.g. `/Users/user/game/assets/graphics/gameplay_gui.json`)
	 */
	jsonPath: string
	/**
	 * Virtual path that combines the spritesheet image path and the frame path in hierarchy
	 * (e.g. `/Users/user/game/assets/graphics/gameplay_gui.png/pause_screen/button_graphics_quality`)
	 *
	 * Note: This is a virtual path that can be used for React keys and hierarchy representation.
	 * It **does not** correspond to an actual file on disk.
	 */
	path: string
	/**
	 * Frame path within the spritesheet hierarchy, used as frame key in the atlas JSON
	 * (e.g. `pause_screen/button_graphics_quality`)
	 */
	pathInHierarchy: string
	size: { w: number; h: number }
	anchor: { x: number; y: number }
	scale9Borders?: {
		x: number
		y: number
		w: number
		h: number
	}
	/**
	 * Absolute path to the TexturePacker project file
	 * (e.g. `/Users/user/game/assets/graphics/gameplay_gui.tps`)
	 */
	project?: string
	/**
	 * ID of the parent spritesheet asset
	 */
	parentId?: string
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

/**
 * Returns true if the asset can be dragged from the Assets panel to the Canvas
 */
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

			const children = getAssetChildren(item)
			if (children) {
				collectAssets(children)
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

export function getAssetById(assets: AssetTreeItemData[], id: string): AssetTreeItemData | undefined {
	const findAsset = (items: AssetTreeItemData[]): AssetTreeItemData | undefined => {
		for (const item of items) {
			if (item.id === id) {
				return item
			}

			const children = getAssetChildren(item)
			if (children) {
				const found = findAsset(children)
				if (found) {
					return found
				}
			}
		}
		return undefined
	}

	return findAsset(assets)
}

/**
 * Recursively removes an asset by its id
 * @note modifies the original array
 * @returns true if the asset was found and removed, false otherwise
 */
export function removeAssetById(assets: AssetTreeItemData[], id: string): boolean {
	// Recursively search in children
	for (let i = 0; i < assets.length; i++) {
		const asset = assets[i]

		if (asset.id === id) {
			assets.splice(i, 1)
			return true
		}

		const children = getAssetChildren(asset)
		if (children) {
			const removed = removeAssetById(children, id)
			if (removed) {
				return true
			}
		}
	}

	return false
}

export function getAssetChildren(asset: AssetTreeItemData): AssetTreeItemData[] | undefined {
	return match(asset)
		.with({ type: 'folder' }, (folder) => folder.children)
		.with({ type: 'spritesheet' }, (spritesheet) => spritesheet.frames)
		.with({ type: 'spritesheet-folder' }, (spritesheetFolder) => spritesheetFolder.children)
		.with({ type: 'file' }, () => undefined)
		.with({ type: 'json' }, () => undefined)
		.with({ type: 'xml' }, () => undefined)
		.with({ type: 'image' }, () => undefined)
		.with({ type: 'prefab' }, () => undefined)
		.with({ type: 'web-font' }, () => undefined)
		.with({ type: 'bitmap-font' }, () => undefined)
		.with({ type: 'spritesheet-frame' }, () => undefined)
		.exhaustive()
}

/**
 * Get path to asset relative to assets root directory.
 */
export function getAssetRelativePath(assetPath: string, baseDir?: string): string {
	baseDir ??= path.join(state.projectDir!, state.project!.assetsDir)
	const prevCwd = path.process_cwd
	path.setCWD(baseDir)
	const relativePath = path.relative(baseDir, assetPath)
	path.setCWD(prevCwd)
	return relativePath
}
