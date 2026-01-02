import { P, match } from 'ts-pattern'
import { AppCommandsEmitter } from '../AppCommands'
import type { EditableContainerJson } from '../components/canvas/phaser/scenes/main/objects/EditableContainer'
import type { EditableObjectJson } from '../components/canvas/phaser/scenes/main/objects/EditableObject'
import { openProjectByPath } from '../project/open-project'
import { state, unproxy } from '../state/State'
import path from 'path-browserify-esm'
import type { AssetTreeItemData } from '../types/assets'
import { getAssetById, getAssetsOfType } from '../types/assets'
import type { AssetNode, AssetType, ControlInput, ControlOutput, HierarchyNode } from './contract'

type PathSegment = {
	name: string
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

	/**
	 * Opens a prefab for editing.
	 *
	 * Accepts either:
	 * - `params.assetId` (preferred), or
	 * - `params.path` (resolved against currently known prefab assets).
	 *
	 * @throws If neither `assetId` nor a resolvable `path` is provided.
	 */
	async openPrefab(params: ControlInput<'open-prefab'>): Promise<ControlOutput<'open-prefab'>> {
		const assetId = match(params)
			.with({ assetId: P.string }, ({ assetId }) => assetId)
			.with({ path: P.string }, ({ path }) => this.resolvePrefabIdByPath(path))
			.exhaustive()

		if (!assetId) {
			throw new Error('open-prefab requires assetId or a valid prefab path')
		}

		this.appCommands.emit('open-prefab', assetId)
		return { success: true }
	}

	/**
	 * Opens a project by filesystem path.
	 *
	 * @throws If `params.path` is missing.
	 * @throws If the project could not be opened.
	 */
	async openProject(params: ControlInput<'open-project'>): Promise<ControlOutput<'open-project'>> {
		if (!params.path) {
			throw new Error('open-project requires a path')
		}

		const opened = await openProjectByPath(params.path)
		if (!opened) {
			throw new Error(`failed to open project at '${params.path}'`)
		}

		return { success: true }
	}

	/**
	 * Returns the current prefab hierarchy as a JSON tree.
	 *
	 * @throws If no prefab is currently open.
	 */
	async listHierarchy(): Promise<ControlOutput<'list-hierarchy'>> {
		const root = state.canvas.root
		if (!root) {
			throw new Error('no prefab is open')
		}

		return buildHierarchyNode(root)
	}

	/**
	 * Returns the current project's asset tree.
	 *
	 * Supports optional filtering by asset `type`. When filtering is used, this returns a pruned tree:
	 * nodes are kept if they match the filter or if they contain matching descendants.
	 *
	 * @throws If no project is currently open.
	 */
	async listAssets(params: ControlInput<'list-assets'>): Promise<ControlOutput<'list-assets'>> {
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

	/**
	 * Selects an object in the editor by `id` or by a hierarchy `path`.
	 *
	 * @throws If neither `id` nor `path` is provided.
	 * @throws If no prefab is currently open when resolving by path.
	 * @throws If the object cannot be found for the provided path.
	 */
	async selectObject(params: ControlInput<'select-object'>): Promise<ControlOutput<'select-object'>> {
		const id = this.resolveObjectId(params)
		this.appCommands.emit('select-object', id)
		return { success: true }
	}

	/**
	 * Switches the editor "context" to a container/object by `id` or hierarchy `path`.
	 *
	 * @throws If neither `id` nor `path` is provided.
	 * @throws If no prefab is currently open when resolving by path.
	 * @throws If the object cannot be found for the provided path.
	 */
	async switchToContext(params: ControlInput<'switch-to-context'>): Promise<ControlOutput<'switch-to-context'>> {
		const id = this.resolveObjectId(params)
		this.appCommands.emit('switch-to-context', id)
		return { success: true }
	}

	/**
	 * Deletes one or more objects by id.
	 *
	 * @throws If `params.ids` is missing or empty.
	 */
	async deleteObjects(params: ControlInput<'delete-objects'>): Promise<ControlOutput<'delete-objects'>> {
		if (!Array.isArray(params.ids) || params.ids.length === 0) {
			throw new Error('delete-objects requires a non-empty ids array')
		}

		this.appCommands.emit('delete-objects', params.ids)
		return { success: true }
	}

	/**
	 * Returns detailed information about an asset by `id` or project-relative `path`.
	 *
	 * @throws If neither `id` nor `path` is provided.
	 * @throws If no project is currently open.
	 * @throws If the asset cannot be found.
	 */
	async getAssetInfo(params: ControlInput<'get-asset-info'>): Promise<ControlOutput<'get-asset-info'>> {
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

	/**
	 * Returns a list of active editors.
	 *
	 * Note: this method is normally intercepted by the main process for external RPC.
	 * In the renderer, it is not implemented as discovery is a main-process responsibility.
	 */
	async listEditors(): Promise<ControlOutput<'list-editors'>> {
		throw new Error('list-editors is only available via the external control RPC')
	}

	/**
	 * Resolves an object id either directly (`params.id`) or by searching the currently open
	 * prefab tree using a hierarchy `path`.
	 *
	 * @throws If neither `id` nor `path` is provided.
	 * @throws If no prefab is currently open.
	 * @throws If the object cannot be found for the provided path.
	 */
	private resolveObjectId(params: ControlInput<'select-object'> | ControlInput<'switch-to-context'>): string {
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

	/**
	 * Converts a prefab asset path into an asset id by searching known prefab assets.
	 *
	 * Note: returns `undefined` when no asset matches the provided path.
	 */
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
