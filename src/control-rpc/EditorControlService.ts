import { AppCommandsEmitter } from '../AppCommands'
import type { EditableContainerJson } from '../components/canvas/phaser/scenes/main/objects/EditableContainer'
import type { EditableObjectJson } from '../components/canvas/phaser/scenes/main/objects/EditableObject'
import { getAssetsOfType } from '../types/assets'
import { state } from '../state/State'
import { openProjectByPath } from '../project/open-project'
import type { ControlInput, ControlOutput, HierarchyNode } from './contract'

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
	async openPrefab(params: ControlInput<'open-prefab'>): Promise<void> {
		const assetId = params.assetId ?? (params.path ? this.resolvePrefabIdByPath(params.path) : undefined)
		if (!assetId) {
			throw new Error('open-prefab requires assetId or a valid prefab path')
		}

		this.appCommands.emit('open-prefab', assetId)
	}

	/**
	 * Opens a project by filesystem path.
	 *
	 * @throws If `params.path` is missing.
	 * @throws If the project could not be opened.
	 */
	async openProject(params: ControlInput<'open-project'>): Promise<void> {
		if (!params.path) {
			throw new Error('open-project requires a path')
		}

		const opened = await openProjectByPath(params.path)
		if (!opened) {
			throw new Error(`failed to open project at '${params.path}'`)
		}
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
	 * Selects an object in the editor by `id` or by a hierarchy `path`.
	 *
	 * @throws If neither `id` nor `path` is provided.
	 * @throws If no prefab is currently open when resolving by path.
	 * @throws If the object cannot be found for the provided path.
	 */
	async selectObject(params: ControlInput<'select-object'>): Promise<void> {
		const id = this.resolveObjectId(params)
		this.appCommands.emit('select-object', id)
	}

	/**
	 * Switches the editor "context" to a container/object by `id` or hierarchy `path`.
	 *
	 * @throws If neither `id` nor `path` is provided.
	 * @throws If no prefab is currently open when resolving by path.
	 * @throws If the object cannot be found for the provided path.
	 */
	async switchToContext(params: ControlInput<'switch-to-context'>): Promise<void> {
		const id = this.resolveObjectId(params)
		this.appCommands.emit('switch-to-context', id)
	}

	/**
	 * Deletes one or more objects by id.
	 *
	 * @throws If `params.ids` is missing or empty.
	 */
	async deleteObjects(params: ControlInput<'delete-objects'>): Promise<void> {
		if (!Array.isArray(params.ids) || params.ids.length === 0) {
			throw new Error('delete-objects requires a non-empty ids array')
		}

		this.appCommands.emit('delete-objects', params.ids)
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
		if (params.id) {
			return params.id
		}

		if (!params.path) {
			throw new Error('id or path must be provided')
		}

		const root = state.canvas.root
		if (!root) {
			throw new Error('no prefab is open')
		}

		const id = resolveObjectIdByPath(root, params.path)
		if (!id) {
			throw new Error(`object not found for path '${params.path}'`)
		}

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
