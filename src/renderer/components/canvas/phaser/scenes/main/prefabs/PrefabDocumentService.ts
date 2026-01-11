import type {
	CanvasDocumentContainerJson,
	CanvasDocumentJson,
	CanvasDocumentNodeJson,
	EditableContainerJson,
	EditableObjectJson,
	NodeAddress,
	PrefabFile,
	PrefabInstanceJson,
	PrefabOverrides,
} from '@tekton/runtime'
import type { ILogObj, Logger } from 'tslog'

import { mainApi } from '@main-api/main-api'
import { until } from '@open-draft/until'
import { getErrorLog } from '@utils/error/utils'

import type { AssetTreePrefabData } from '../../../../../../types/assets'
import type { EditableContainer } from '../objects/EditableContainer'
import type { EditableObject } from '../objects/EditableObject'

import { isPrefabInstanceJson } from '../../../../../../prefabs/prefabContractUtils'
import { state } from '../../../../../../state/State'
import { getAssetById } from '../../../../../../types/assets'
import { MainSceneAssetLoader } from '../mainScene/MainSceneAssetLoader'
import { EditableObjectsFactory } from '../objects/EditableObjectsFactory'
import { createLocalId } from '../objects/localId'
import {
	ResolvedPrefabNode,
	ResolvedPrefabTree,
	addressKey,
	cloneResolvedTree,
	collectResolvedNodes,
	createEmptyOverrides,
	ensureDocumentLocalIds,
	ensureNodeLocalId,
	isPrefabInstanceRuntimeRoot,
	normalizeOverrides,
	normalizePrefabInstance,
	prefixResolvedTree,
} from './prefabDocumentUtils'
import { applyComponentOverride, applyObjectPatch, buildComponentOverrides, buildObjectOverride } from './prefabOverrides'

type PrefabDocumentServiceDeps = {
	logger: Logger<ILogObj>
	objectsFactory: EditableObjectsFactory
	assetLoader: MainSceneAssetLoader
}

const INSTANCE_PROP_KEYS: Array<keyof PrefabInstanceJson> = [
	'name',
	'visible',
	'locked',
	'x',
	'y',
	'angle',
	'scale',
	'alpha',
	'originX',
	'originY',
	'width',
	'height',
	'depth',
	'blendMode',
	'displayWidth',
	'displayHeight',
]

export class PrefabDocumentService {
	private prefabDocuments = new Map<string, CanvasDocumentJson>()
	private resolvedTemplates = new Map<string, ResolvedPrefabTree>()

	constructor(private deps: PrefabDocumentServiceDeps) {}

	public invalidatePrefab(prefabId: string): void {
		const hadDocument = this.prefabDocuments.delete(prefabId)
		const hadTemplate = this.resolvedTemplates.delete(prefabId)
		if (hadDocument || hadTemplate) {
			this.deps.logger.debug(`[prefab-doc] cache-invalidate prefabId=${prefabId}`)
		}
	}

	public invalidateAll(): void {
		const docs = this.prefabDocuments.size
		const templates = this.resolvedTemplates.size
		if (docs === 0 && templates === 0) {
			return
		}
		this.prefabDocuments.clear()
		this.resolvedTemplates.clear()
		this.deps.logger.debug(`[prefab-doc] cache-invalidate-all documents=${docs} templates=${templates}`)
	}

	public async expandDocumentToRuntime(document: CanvasDocumentJson, isPrefabScope = false): Promise<EditableContainer> {
		ensureDocumentLocalIds(document)
		const resolved = await this.resolveDocumentAsync(document, [], isPrefabScope)
		if (resolved.json.type === 'Container') {
			await this.deps.assetLoader.loadPrefabAssets(resolved.json)
		}
		const runtimeRoot = this.deps.objectsFactory.fromJson(resolved.json, true) as EditableContainer
		this.applyPrefabMeta(runtimeRoot, resolved)
		return runtimeRoot
	}

	public async createPrefabInstanceRuntime(prefabAsset: AssetTreePrefabData): Promise<EditableContainer | null> {
		const template = await this.resolveTemplateAsync(prefabAsset.id)
		if (!template) {
			return null
		}

		const instance = this.createPrefabInstanceJson(prefabAsset, template.root.json)
		const resolvedInstance = this.applyInstanceOverrides(template, instance)
		if (resolvedInstance.root.json.type === 'Container') {
			await this.deps.assetLoader.loadPrefabAssets(resolvedInstance.root.json)
		}
		const runtimeRoot = this.deps.objectsFactory.fromJson(resolvedInstance.root.json, false) as EditableContainer
		this.applyPrefabMeta(runtimeRoot, resolvedInstance.root)
		this.deps.logger.info(`[prefab-doc] create-instance prefabId=${prefabAsset.id} name='${prefabAsset.name}'`)
		return runtimeRoot
	}

	public serializeRuntimeToDocument(root: EditableContainer): CanvasDocumentJson {
		return this.serializeNode(root) as CanvasDocumentJson
	}

	public getResolvedTemplate(prefabId: string): ResolvedPrefabTree | null {
		return this.resolvedTemplates.get(prefabId) ?? null
	}

	public async resolveTemplateAsync(prefabId: string): Promise<ResolvedPrefabTree | null> {
		if (this.resolvedTemplates.has(prefabId)) {
			this.deps.logger.debug(`[prefab-doc] cache-hit template prefabId=${prefabId}`)
			return this.resolvedTemplates.get(prefabId) ?? null
		}

		this.deps.logger.debug(`[prefab-doc] cache-miss template prefabId=${prefabId}`)

		const document = await this.loadPrefabDocument(prefabId)
		if (!document) {
			return null
		}

		const root = await this.resolveDocumentAsync(document, [], true)
		const addressMap = new Map<string, ResolvedPrefabNode>()
		collectResolvedNodes(root, addressMap)
		const resolved: ResolvedPrefabTree = { root, addressMap }
		this.resolvedTemplates.set(prefabId, resolved)
		return resolved
	}

	private async loadPrefabDocument(prefabId: string): Promise<CanvasDocumentJson | null> {
		const cached = this.prefabDocuments.get(prefabId)
		if (cached) {
			this.deps.logger.debug(`[prefab-doc] cache-hit document prefabId=${prefabId}`)
			return cached
		}

		this.deps.logger.debug(`[prefab-doc] cache-miss document prefabId=${prefabId}`)

		const asset = getAssetById(state.assets.items, prefabId)
		if (!asset || asset.type !== 'prefab') {
			this.deps.logger.warn(`[prefab-doc] prefab '${prefabId}' not found`)
			return null
		}

		const { error, data } = await until(() => mainApi.readJson({ path: asset.path }))
		if (error) {
			this.deps.logger.error(`[prefab-doc] failed to read '${asset.path}' (${getErrorLog(error)})`)
			return null
		}

		const prefabFile = data as PrefabFile
		if (!prefabFile.content) {
			return null
		}

		ensureDocumentLocalIds(prefabFile.content)
		this.prefabDocuments.set(prefabId, prefabFile.content)
		return prefabFile.content
	}

	private async resolveDocumentAsync(
		node: CanvasDocumentNodeJson,
		prefix: NodeAddress,
		isPrefabScope: boolean,
	): Promise<ResolvedPrefabNode> {
		if (isPrefabInstanceJson(node)) {
			const prefabId = node.prefabRef.id
			const template = await this.resolveTemplateAsync(prefabId)
			if (!template) {
				const emptyRoot = this.createFallbackRoot(node)
				return {
					json: emptyRoot,
					address: [...prefix, { kind: 'local', localId: emptyRoot.localId ?? createLocalId() }],
					children: [],
					prefabInstance: normalizePrefabInstance(node),
				}
			}

			const resolvedInstance = this.applyInstanceOverrides(template, node)
			if (isPrefabScope) {
				const nestedPrefix = prefix.concat({ kind: 'nestedPrefab', prefabId })
				prefixResolvedTree(resolvedInstance, nestedPrefix)
			}
			const instanceRoot = resolvedInstance.root
			instanceRoot.prefabInstance = normalizePrefabInstance(node)
			return instanceRoot
		}

		const normalized = ensureNodeLocalId(node)
		const address = prefix.concat({ kind: 'local', localId: normalized.localId! })

		if (normalized.type !== 'Container') {
			return {
				json: normalized as EditableObjectJson,
				address,
			}
		}

		const children = await Promise.all(normalized.children.map((child) => this.resolveDocumentAsync(child, address, isPrefabScope)))
		const json: EditableContainerJson = {
			...(normalized as EditableContainerJson),
			children: children.map((child) => child.json),
		}

		return {
			json,
			address,
			children,
		}
	}

	private applyInstanceOverrides(template: ResolvedPrefabTree, instance: PrefabInstanceJson): ResolvedPrefabTree {
		const resolved = cloneResolvedTree(template)
		const overrides = normalizeOverrides(instance.overrides)

		for (const entry of overrides.objects) {
			const node = resolved.addressMap.get(addressKey(entry.target))
			if (!node) {
				continue
			}
			applyObjectPatch(node.json, entry.patch)
		}

		for (const entry of overrides.components) {
			const node = resolved.addressMap.get(addressKey(entry.target))
			if (!node || !node.json.components) {
				continue
			}
			const component = node.json.components.find((comp) => comp.id === entry.componentId)
			if (!component) {
				continue
			}
			applyComponentOverride(component, entry.patch)
		}

		this.applyInstancePropsToRoot(resolved.root.json, instance)
		if (resolved.root.json.type === 'Container') {
			;(resolved.root.json as EditableContainerJson).prefab = instance.prefabRef
		}
		resolved.root.prefabInstance = normalizePrefabInstance(instance)

		return resolved
	}

	private applyInstancePropsToRoot(root: EditableObjectJson, instance: PrefabInstanceJson): void {
		for (const key of INSTANCE_PROP_KEYS) {
			if (key in instance) {
				;(root as Record<string, unknown>)[key] = instance[key]
			}
		}
	}

	private applyPrefabMeta(runtimeRoot: EditableObject, resolvedRoot: ResolvedPrefabNode): void {
		const apply = (runtimeNode: EditableObject, resolvedNode: ResolvedPrefabNode, instanceRootId?: string) => {
			let currentInstanceRootId = instanceRootId

			if (resolvedNode.prefabInstance && runtimeNode.kind === 'Container') {
				const container = runtimeNode as EditableContainer
				container.prefabInstanceLocalId = resolvedNode.prefabInstance.localId
				currentInstanceRootId = container.id
				container.prefabMeta = {
					instanceRootRuntimeId: container.id,
					address: resolvedNode.address,
				}
			} else if (instanceRootId) {
				runtimeNode.prefabMeta = {
					instanceRootRuntimeId: instanceRootId,
					address: resolvedNode.address,
				}
			}

			if (runtimeNode.kind === 'Container' && resolvedNode.children) {
				const runtimeChildren = (runtimeNode as EditableContainer).editables
				for (let index = 0; index < resolvedNode.children.length; index += 1) {
					const runtimeChild = runtimeChildren[index]
					const resolvedChild = resolvedNode.children[index]
					if (!runtimeChild || !resolvedChild) {
						continue
					}
					apply(runtimeChild, resolvedChild, currentInstanceRootId)
				}
			}
		}

		apply(runtimeRoot, resolvedRoot)
	}

	private serializeNode(node: EditableObject): CanvasDocumentNodeJson {
		if (isPrefabInstanceRuntimeRoot(node)) {
			return this.serializePrefabInstance(node as EditableContainer)
		}

		const json = node.toJson()
		if (node.kind !== 'Container') {
			return json
		}

		const containerJson: EditableContainerJson = json as EditableContainerJson
		return {
			...containerJson,
			children: (node as EditableContainer).editables.map((child) => this.serializeNode(child)),
		} satisfies CanvasDocumentContainerJson
	}

	private serializePrefabInstance(root: EditableContainer): PrefabInstanceJson {
		const prefabRef = root.prefab
		const instanceLocalId = root.prefabInstanceLocalId ?? root.localId ?? createLocalId()
		root.prefabInstanceLocalId = instanceLocalId

		const overrides = prefabRef ? this.buildOverrides(root, prefabRef.id) : createEmptyOverrides()

		return {
			type: 'PrefabInstance',
			localId: instanceLocalId,
			prefabRef: prefabRef ?? { id: '', name: '' },
			overrides,
			name: root.name,
			visible: root.visible,
			locked: root.locked,
			x: root.x,
			y: root.y,
			angle: root.angle,
			scale: { x: root.scaleX, y: root.scaleY },
			alpha: root.alpha,
			originX: root.originX,
			originY: root.originY,
			width: root.width,
			height: root.height,
			depth: root.depth,
			blendMode: root.blendMode,
			displayWidth: root.displayWidth,
			displayHeight: root.displayHeight,
		}
	}

	private buildOverrides(root: EditableContainer, prefabId: string): PrefabOverrides {
		const template = this.resolvedTemplates.get(prefabId)
		if (!template) {
			this.deps.logger.warn(`[prefab-doc] missing template cache for '${prefabId}', skipping overrides`)
			return createEmptyOverrides()
		}

		const runtimeEntries = new Map<string, EditableObjectJson>()
		const rootAddress = root.prefabMeta?.address
		const rootTargetAddress = rootAddress ? this.getRelativeAddress(rootAddress, rootAddress) : rootAddress
		const rootTargetKey = rootTargetAddress ? addressKey(rootTargetAddress) : null
		const collect = (obj: EditableObject) => {
			const meta = obj.prefabMeta
			if (!meta) {
				return
			}
			if (rootAddress) {
				if (!this.isAddressPrefix(rootAddress, meta.address)) {
					return
				}
			} else if (meta.instanceRootRuntimeId !== root.id) {
				return
			}
			const relativeAddress = this.getRelativeAddress(rootAddress, meta.address)
			runtimeEntries.set(addressKey(relativeAddress), obj.toJson())
			if (obj.kind === 'Container') {
				;(obj as EditableContainer).editables.forEach((child) => collect(child))
			}
		}

		collect(root)

		const overrides: PrefabOverrides = { objects: [], components: [] }

		for (const [addrKey, runtimeJson] of runtimeEntries) {
			const base = template.addressMap.get(addrKey)
			if (!base) {
				continue
			}

			const target = base.address
			const isRootAddress = rootTargetKey ? rootTargetKey === addrKey : false
			if (!isRootAddress) {
				const objOverride = buildObjectOverride(target, base.json, runtimeJson)
				if (objOverride) {
					overrides.objects.push(objOverride)
				}
			}

			const componentOverrides = buildComponentOverrides(target, base.json.components ?? [], runtimeJson.components ?? [])
			overrides.components.push(...componentOverrides)
		}

		return overrides
	}

	private getRelativeAddress(rootAddress: NodeAddress | undefined, address: NodeAddress): NodeAddress {
		if (!rootAddress || rootAddress.length === 0) {
			return address
		}
		if (!this.isAddressPrefix(rootAddress, address)) {
			return address
		}
		const anchor = rootAddress[rootAddress.length - 1]
		if (anchor.kind !== 'local') {
			return address
		}
		return [anchor, ...address.slice(rootAddress.length)]
	}

	private isAddressPrefix(prefix: NodeAddress, address: NodeAddress): boolean {
		if (address.length < prefix.length) {
			return false
		}
		for (let index = 0; index < prefix.length; index += 1) {
			const a = prefix[index]
			const b = address[index]
			if (!b || a.kind !== b.kind) {
				return false
			}
			if (a.kind === 'local' && a.localId !== (b as typeof a).localId) {
				return false
			}
			if (a.kind === 'nestedPrefab' && a.prefabId !== (b as typeof a).prefabId) {
				return false
			}
		}
		return true
	}

	private createPrefabInstanceJson(prefab: AssetTreePrefabData, templateRoot: EditableObjectJson): PrefabInstanceJson {
		const base = templateRoot
		return {
			type: 'PrefabInstance',
			localId: createLocalId(),
			prefabRef: { id: prefab.id, name: prefab.name },
			overrides: createEmptyOverrides(),
			name: base.name ?? prefab.name,
			visible: base.visible ?? true,
			locked: base.locked ?? false,
			x: base.x ?? 0,
			y: base.y ?? 0,
			angle: base.angle ?? 0,
			scale: base.scale ?? { x: 1, y: 1 },
			alpha: base.alpha ?? 1,
			originX: base.originX ?? 0.5,
			originY: base.originY ?? 0.5,
			width: base.width ?? 100,
			height: base.height ?? 100,
			depth: base.depth ?? 0,
			blendMode: base.blendMode ?? 0,
			displayWidth: base.displayWidth ?? base.width ?? 100,
			displayHeight: base.displayHeight ?? base.height ?? 100,
		}
	}

	private createFallbackRoot(instance: PrefabInstanceJson): EditableObjectJson {
		const fallback: EditableContainerJson = {
			'type': 'Container',
			'id': createLocalId(),
			'localId': createLocalId(),
			'name': instance.prefabRef.name,
			'visible': true,
			'locked': false,
			'x': 0,
			'y': 0,
			'scale': { x: 1, y: 1 },
			'scale.x': 1,
			'scale.y': 1,
			'origin': { x: 0, y: 0 },
			'origin.x': 0,
			'origin.y': 0,
			'flipX': false,
			'flipY': false,
			'rotation': 0,
			'angle': 0,
			'alpha': 1,
			'originX': 0,
			'originY': 0,
			'scaleMode': 0,
			'textureKey': '',
			'frameKey': '',
			'data': {},
			'width': 100,
			'height': 100,
			'depth': 0,
			'blendMode': 0,
			'displayWidth': 100,
			'displayHeight': 100,
			'components': [],
			'children': [],
			'prefab': instance.prefabRef,
		}
		return fallback
	}
}
