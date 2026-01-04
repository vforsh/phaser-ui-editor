import { match } from 'ts-pattern'

import type { AssetTreeItemData } from '../../../types/assets'
import type { AssetNode, AssetType } from '../../api/ControlApi'

import { toProjectRelativePath } from './paths'

export function normalizeAssetPaths(asset: AssetTreeItemData, projectDir: string): AssetNode {
	return match(asset)
		.returnType<AssetNode>()
		.with({ type: 'folder' }, (folder) => ({
			...folder,
			path: toProjectRelativePath(folder.path, projectDir),
			children: folder.children.map((child) => normalizeAssetPaths(child, projectDir)),
		}))
		.with({ type: 'spritesheet' }, (spritesheet) => ({
			...spritesheet,
			path: toProjectRelativePath(spritesheet.path, projectDir),
			project: spritesheet.project ? toProjectRelativePath(spritesheet.project, projectDir) : undefined,
			image: {
				...spritesheet.image,
				path: toProjectRelativePath(spritesheet.image.path, projectDir),
			},
			json: {
				...spritesheet.json,
				path: toProjectRelativePath(spritesheet.json.path, projectDir),
			},
			frames: spritesheet.frames.map((child) => normalizeAssetPaths(child, projectDir)) as AssetNode['frames'],
		}))
		.with({ type: 'spritesheet-folder' }, (spritesheetFolder) => ({
			...spritesheetFolder,
			path: toProjectRelativePath(spritesheetFolder.path, projectDir),
			imagePath: toProjectRelativePath(spritesheetFolder.imagePath, projectDir),
			jsonPath: toProjectRelativePath(spritesheetFolder.jsonPath, projectDir),
			project: spritesheetFolder.project ? toProjectRelativePath(spritesheetFolder.project, projectDir) : undefined,
			children: spritesheetFolder.children.map((child) => normalizeAssetPaths(child, projectDir)) as AssetNode[],
		}))
		.with({ type: 'spritesheet-frame' }, (spritesheetFrame) => ({
			...spritesheetFrame,
			path: toProjectRelativePath(spritesheetFrame.path, projectDir),
			imagePath: toProjectRelativePath(spritesheetFrame.imagePath, projectDir),
			jsonPath: toProjectRelativePath(spritesheetFrame.jsonPath, projectDir),
			project: spritesheetFrame.project ? toProjectRelativePath(spritesheetFrame.project, projectDir) : undefined,
		}))
		.with({ type: 'bitmap-font' }, (bitmapFont) => ({
			...bitmapFont,
			path: toProjectRelativePath(bitmapFont.path, projectDir),
			image: {
				...bitmapFont.image,
				path: toProjectRelativePath(bitmapFont.image.path, projectDir),
			},
			data: {
				...bitmapFont.data,
				path: toProjectRelativePath(bitmapFont.data.path, projectDir),
			},
			imageExtra: bitmapFont.imageExtra
				? {
						...bitmapFont.imageExtra,
						atlas: toProjectRelativePath(bitmapFont.imageExtra.atlas, projectDir),
						texture: toProjectRelativePath(bitmapFont.imageExtra.texture, projectDir),
						texturePacker: toProjectRelativePath(bitmapFont.imageExtra.texturePacker, projectDir),
					}
				: undefined,
		}))
		.with({ type: 'image' }, (image) => ({
			...image,
			path: toProjectRelativePath(image.path, projectDir),
		}))
		.with({ type: 'json' }, (json) => ({
			...json,
			path: toProjectRelativePath(json.path, projectDir),
		}))
		.with({ type: 'xml' }, (xml) => ({
			...xml,
			path: toProjectRelativePath(xml.path, projectDir),
		}))
		.with({ type: 'prefab' }, (prefab) => ({
			...prefab,
			path: toProjectRelativePath(prefab.path, projectDir),
		}))
		.with({ type: 'web-font' }, (webFont) => ({
			...webFont,
			path: toProjectRelativePath(webFont.path, projectDir),
		}))
		.with({ type: 'file' }, (file) => ({
			...file,
			path: toProjectRelativePath(file.path, projectDir),
		}))
		.exhaustive()
}

export function findAssetByPath(
	items: AssetTreeItemData[],
	projectRelativePath: string,
	projectDir: string,
): AssetTreeItemData | undefined {
	for (const item of items) {
		if (toProjectRelativePath(item.path, projectDir) === projectRelativePath) {
			return item
		}

		const children = match(item)
			.with({ type: 'folder' }, (f) => f.children)
			.with({ type: 'spritesheet' }, (s) => s.frames)
			.with({ type: 'spritesheet-folder' }, (f) => f.children)
			.otherwise(() => undefined)

		if (children) {
			const found = findAssetByPath(children as AssetTreeItemData[], projectRelativePath, projectDir)
			if (found) {
				return found
			}
		}
	}
	return undefined
}

export function pruneAssetByType(asset: AssetNode, types: Set<AssetType>): AssetNode | null {
	const keepSelf = types.has(asset.type)

	return match(asset)
		.with({ type: 'folder' }, (folder) => {
			const children = folder.children
				?.map((child) => pruneAssetByType(child, types))
				.filter((child): child is AssetNode => Boolean(child))

			if (!keepSelf && (!children || children.length === 0)) {
				return null
			}

			return {
				...folder,
				children: children ?? [],
			}
		})
		.with({ type: 'spritesheet' }, (spritesheet) => {
			const frames = spritesheet.frames
				?.map((child) => pruneAssetByType(child as AssetNode, types))
				.filter((child): child is AssetNode => Boolean(child)) as AssetNode['frames']

			if (!keepSelf && (!frames || frames.length === 0)) {
				return null
			}

			return {
				...spritesheet,
				frames: frames ?? [],
			}
		})
		.with({ type: 'spritesheet-folder' }, (spritesheetFolder) => {
			const children = spritesheetFolder.children
				?.map((child) => pruneAssetByType(child, types))
				.filter((child): child is AssetNode => Boolean(child))

			if (!keepSelf && (!children || children.length === 0)) {
				return null
			}

			return {
				...spritesheetFolder,
				children: children ?? [],
			}
		})
		.otherwise(() => (keepSelf ? asset : null))
}
