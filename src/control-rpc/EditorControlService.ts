import path from 'path-browserify-esm'
import { P, match } from 'ts-pattern'
import { AppCommandsEmitter } from '../AppCommands'
import type { EditableContainerJson } from '../components/canvas/phaser/scenes/main/objects/EditableContainer'
import type { EditableObjectJson } from '../components/canvas/phaser/scenes/main/objects/EditableObject'
import { openProjectByPath } from '../project/open-project'
import { state, unproxy } from '../state/State'
import type { AssetTreeItemData } from '../types/assets'
import { getAssetById, getAssetsOfType } from '../types/assets'
import type { deleteObjectsCommand } from './api/commands/deleteObjects'
import type { getAssetInfoCommand } from './api/commands/getAssetInfo'
import type { getProjectInfoCommand } from './api/commands/getProjectInfo'
import type { listAssetsCommand } from './api/commands/listAssets'
import type { listEditorsCommand } from './api/commands/listEditors'
import type { listHierarchyCommand } from './api/commands/listHierarchy'
import type { openPrefabCommand } from './api/commands/openPrefab'
import type { openProjectCommand } from './api/commands/openProject'
import type { selectObjectCommand } from './api/commands/selectObject'
import type { switchToContextCommand } from './api/commands/switchToContext'
import type { AssetNode, AssetType, ControlInput, ControlOutput, HierarchyNode } from './api/ControlApi'

/**
 * Represents a single segment in a hierarchy path (e.g., "Main/Container[1]").
 */
type PathSegment = {
	/**
	 * The name of the object.
	 */
	name: string
	/**
	 * The zero-based index of the object among siblings with the same name.
	 */
	index: number
}

/**
 * Thin RPC-facing service that translates external control requests into internal editor commands.
 *
 * This class is used by the control-RPC layer to drive editor behavior (open project/prefab,
 * selection, context switching, deletions) while keeping the actual UI logic inside the app.
 */
export class EditorControlService {
	private readonly appCommands: AppCommandsEmitter

	/**
	 * @param appCommands - Internal command bus used to trigger editor actions.
	 */
	constructor(appCommands: AppCommandsEmitter) {
		this.appCommands = appCommands
	}

	// #region Commands

	/** @see {@link openPrefabCommand} */
	async openPrefab(params: ControlInput<'openPrefab'>): Promise<ControlOutput<'openPrefab'>> {
		const assetId = match(params)
			.with({ assetId: P.string }, ({ assetId }) => assetId)
			.with({ path: P.string }, ({ path }) => this.resolvePrefabIdByPath(path))
			.exhaustive()

		if (!assetId) {
			throw new Error('openPrefab requires assetId or a valid prefab path')
		}

		this.appCommands.emit('open-prefab', assetId)
		return { success: true }
	}

	/** @see {@link openProjectCommand} */
	async openProject(params: ControlInput<'openProject'>): Promise<ControlOutput<'openProject'>> {
		if (!params.path) {
			throw new Error('openProject requires a path')
		}

		const opened = await openProjectByPath(params.path)
		if (!opened) {
			throw new Error(`failed to open project at '${params.path}'`)
		}

		return { success: true }
	}

	/** @see {@link getProjectInfoCommand} */
	async getProjectInfo(): Promise<ControlOutput<'getProjectInfo'>> {
		if (!state.project || !state.projectDir) {
			throw new Error('no project is open')
		}

		return {
			...unproxy(state.project),
			path: state.projectDir,
		}
	}

	/** @see {@link listHierarchyCommand} */
	async listHierarchy(): Promise<ControlOutput<'listHierarchy'>> {
		const root = state.canvas.root
		if (!root) {
			throw new Error('no prefab is open')
		}

		return buildHierarchyNode(root)
	}

	/** @see {@link listAssetsCommand} */
	async listAssets(params: ControlInput<'listAssets'>): Promise<ControlOutput<'listAssets'>> {
		if (!state.projectDir) {
			throw new Error('no project is open')
		}

		const requestedTypes = params.types?.length ? new Set<AssetType>(params.types) : undefined
		const assets = unproxy(state.assets.items) as AssetTreeItemData[]
		const normalized = assets.map((asset) => normalizeAssetPaths(asset, state.projectDir!))

		const filtered = requestedTypes
			? normalized
					.map((asset) => pruneAssetByType(asset, requestedTypes))
					.filter((asset): asset is AssetNode => Boolean(asset))
			: (normalized as unknown as AssetNode[])

		return { assets: filtered }
	}

	/** @see {@link selectObjectCommand} */
	async selectObject(params: ControlInput<'selectObject'>): Promise<ControlOutput<'selectObject'>> {
		const id = this.resolveObjectId(params)
		this.appCommands.emit('select-object', id)
		return { success: true }
	}

	/** @see {@link switchToContextCommand} */
	async switchToContext(params: ControlInput<'switchToContext'>): Promise<ControlOutput<'switchToContext'>> {
		const id = this.resolveObjectId(params)
		this.appCommands.emit('switch-to-context', id)
		return { success: true }
	}

	/** @see {@link deleteObjectsCommand} */
	async deleteObjects(params: ControlInput<'deleteObjects'>): Promise<ControlOutput<'deleteObjects'>> {
		if (!Array.isArray(params.ids) || params.ids.length === 0) {
			throw new Error('deleteObjects requires a non-empty ids array')
		}

		this.appCommands.emit('delete-objects', params.ids)
		return { success: true }
	}

	/** @see {@link getAssetInfoCommand} */
	async getAssetInfo(params: ControlInput<'getAssetInfo'>): Promise<ControlOutput<'getAssetInfo'>> {
		if (!state.projectDir) {
			throw new Error('no project is open')
		}

		const id = match(params)
			.with({ id: P.string }, ({ id }) => id)
			.with({ path: P.string }, ({ path }) => {
				const asset = findAssetByPath(state.assets.items, path, state.projectDir!)
				if (!asset) {
					throw new Error(`asset not found for path '${path}'`)
				}
				return asset.id
			})
			.exhaustive()

		const assetData = getAssetById(state.assets.items, id)
		if (!assetData) {
			throw new Error(`asset not found for id '${id}'`)
		}

		return normalizeAssetPaths(unproxy(assetData) as AssetTreeItemData, state.projectDir)
	}

	/** @see {@link listEditorsCommand} */
	async listEditors(): Promise<ControlOutput<'listEditors'>> {
		throw new Error('listEditors is only available via the external control RPC')
	}

	// #endregion Commands

	private resolveObjectId(params: ControlInput<'selectObject'> | ControlInput<'switchToContext'>): string {
		const id = match(params)
			.with({ id: P.string }, ({ id }) => id)
			.with({ path: P.string }, ({ path }) => {
				const root = state.canvas.root
				if (!root) {
					throw new Error('no prefab is open')
				}
				const resolvedId = resolveObjectIdByPath(root, path)
				if (!resolvedId) {
					throw new Error(`object not found for path '${path}'`)
				}
				return resolvedId
			})
			.exhaustive()

		return id
	}

	private resolvePrefabIdByPath(prefabPath: string): string | undefined {
		const prefabAssets = getAssetsOfType(state.assets.items, 'prefab')
		const asset = prefabAssets.find((item) => item.path === prefabPath)
		return asset?.id
	}
}

function toProjectRelativePath(filePath: string, projectDir: string): string {
	if (!filePath) {
		return filePath
	}

	if (!path.isAbsolute(filePath)) {
		return filePath
	}

	if (!filePath.startsWith(projectDir)) {
		return filePath
	}

	return path.relative(projectDir, filePath)
}

function normalizeAssetPaths(asset: AssetTreeItemData, projectDir: string): AssetNode {
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
			project: spritesheetFolder.project
				? toProjectRelativePath(spritesheetFolder.project, projectDir)
				: undefined,
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

function findAssetByPath(
	items: AssetTreeItemData[],
	projectRelativePath: string,
	projectDir: string
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

function pruneAssetByType(asset: AssetNode, types: Set<AssetType>): AssetNode | null {
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

function buildHierarchyNode(obj: EditableObjectJson): HierarchyNode {
	const base: HierarchyNode = {
		id: obj.id,
		name: obj.name,
		type: obj.type,
	}

	if (!('children' in obj)) {
		return base
	}

	const container = obj as EditableContainerJson
	const children = container.children.map((child) => buildHierarchyNode(child))
	if (children.length > 0) {
		base.children = children
	}

	return base
}

function resolveObjectIdByPath(root: EditableContainerJson, rawPath: string): string | undefined {
	const segments = parsePath(rawPath)
	if (segments.length === 0) {
		return undefined
	}

	let current: EditableObjectJson | undefined = root
	for (const segment of segments) {
		if (!current || !('children' in current)) {
			return undefined
		}

		const container = current as EditableContainerJson
		const matchingChildren = container.children.filter((child) => child.name === segment.name)
		const next = matchingChildren[segment.index]
		if (!next) {
			return undefined
		}

		current = next
	}

	return current?.id
}

function parsePath(rawPath: string): PathSegment[] {
	const trimmed = rawPath.trim()
	if (!trimmed) {
		return []
	}

	const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed

	return cleanPath
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => {
			const match = part.match(/^(.*?)(?:\[(\d+)\])?$/)
			if (!match) {
				return { name: part, index: 0 }
			}

			const name = match[1]
			const index = match[2] ? Number.parseInt(match[2], 10) : 0
			return {
				name,
				index: Number.isNaN(index) ? 0 : index,
			}
		})
}
