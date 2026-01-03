import { getNameWithoutExtension } from '@components/assetsPanel/AssetTreeItem'
import { IPatchesConfig } from '@koreez/phaser3-ninepatch'
import { until } from '@open-draft/until'
import { state, subscribe } from '@state/State'
import { urlParams } from '@url-params'
import { getErrorLog } from '@utils/error/utils'
import { once } from 'es-toolkit'
import { err, ok, Result } from 'neverthrow'
import { match } from 'ts-pattern'
import { ILogObj, Logger } from 'tslog'
import WebFont from 'webfontloader'
import { AppCommandsEmitter } from '../../../../../AppCommands'
import { logger } from '@logs/logs'
import { Project } from '../../../../../project/Project'
import { backend } from '../../../../../backend-renderer/backend'
import type { WebFontParsed } from '../../../../../backend-contract/types'
import {
	AssetTreeBitmapFontData,
	AssetTreeItemData,
	AssetTreeItemDataOfType,
	AssetTreePrefabData,
	AssetTreeSpritesheetFrameData,
	AssetTreeWebFontData,
	fetchImageUrl,
	getAssetById,
	getAssetRelativePath,
	GraphicAssetData,
	isAssetOfType,
} from '../../../../../types/assets'
import {
	createPrefabAsset,
	PrefabAsset,
	PrefabBitmapFontAsset,
	PrefabImageAsset,
	PrefabSpritesheetFrameAsset,
	PrefabWebFontAsset,
} from '../../../../../types/prefabs/PrefabAsset'
import { PrefabFile } from '../../../../../types/prefabs/PrefabFile'
import { parseJsonBitmapFont } from '../../robowhale/phaser3/gameObjects/bitmap-text/parse-json-bitmap-font'
import type { BmFontData } from '../../robowhale/phaser3/gameObjects/bitmap-text/create-bmfont-data'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { signalFromEvent } from '../../robowhale/utils/events/create-abort-signal-from-event'
import { Aligner } from './Aligner'
import { CanvasClipboard } from './CanvasClipboard'
import { EditContext } from './editContext/EditContext'
import { EditContextsManager } from './editContext/EditContextsManager'
import { getEditableWorldBounds } from './editContext/object-bounds'
import { Selection } from './editContext/Selection'
import { TransformControls } from './editContext/TransformControls'
import { EditContextFrame } from './EditContextFrame'
import { Grid } from './Grid'
import { LayoutSystem } from './layout/LayoutSystem'
import {
	AddComponentResult,
	MoveComponentResult,
	RemoveComponentResult,
} from './objects/components/base/ComponentsManager'
import { EditableComponentJson, EditableComponentType } from './objects/components/base/EditableComponent'
import { EditableComponentsFactory } from './objects/components/base/EditableComponentsFactory'
import { EditableContainer, EditableContainerJson } from './objects/EditableContainer'
import { EditableObject, EditableObjectJson, EditableObjectType, isObjectOfType } from './objects/EditableObject'
import { EditableObjectsFactory } from './objects/EditableObjectsFactory'
import { isPositionLockedForRuntimeObject } from './objects/editing/editRestrictions'
import { Rulers } from './Rulers'

type PhaserBmfontData = Phaser.Types.GameObjects.BitmapText.BitmapFontData

type CanvasDocumentSnapshot = {
	rootJson: EditableContainerJson
	activeContextId?: string
	selectionIds: string[]
	camera?: { zoom: number; scrollX: number; scrollY: number }
}

const deepEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function formatScreenshotTimestamp(date: Date): string {
	// 2026-01-02T12-34-56 (filesystem-safe across platforms)
	return date.toISOString().replace(/\.\d{3}Z$/, '').replace(/:/g, '-')
}

function sanitizeFileNamePart(value: string): string {
	const trimmed = value.trim()
	if (!trimmed) {
		return 'screenshot'
	}

	// Replace characters that are commonly invalid/unfriendly in filenames.
	return trimmed
		.replace(/[<>:"/\\|?*]/g, '_')
		.replace(/\s+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '')
}

function getPrefabBaseName(name: string): string {
	const trimmed = name.trim()
	if (!trimmed) {
		return ''
	}

	// Handle `.prefab.json` and `.prefab` explicitly (common in this repo).
	const withoutKnownExt = trimmed.replace(/\.prefab\.json$/i, '').replace(/\.prefab$/i, '')
	if (withoutKnownExt !== trimmed) {
		return withoutKnownExt
	}

	// Fallback: strip the last extension.
	return trimmed.replace(/\.[^.]+$/, '')
}

export type MainSceneInitData = {
	project: Project
	prefabAsset: AssetTreePrefabData
	prefabFile: PrefabFile
}

type SelectionDragData = {
	target: Selection
	// initial position of the selection
	currentX: number
	currentY: number
	// initial offset of the selection relative to the pointer
	offsetX: number
	offsetY: number
	// axis to lock the selection movement on
	lockAxis: 'x' | 'y' | 'none'
}

export class MainScene extends BaseScene {
	public declare initData: MainSceneInitData
	private logger!: Logger<ILogObj>
	private sceneClickedAt: number | undefined
	private cameraDrag = false
	private cameraDragStart: { x: number; y: number } | undefined
	private selectionDrag: SelectionDragData | undefined
	private selectionDragSnapshot: CanvasDocumentSnapshot | undefined
	private transformControlsSnapshot:
		| { before: CanvasDocumentSnapshot; type: 'rotate' | 'resize' | 'origin' }
		| undefined
	private grid!: Grid
	private rulers!: Rulers
	private editContexts!: EditContextsManager
	private superRoot!: EditableContainer
	private root!: EditableContainer
	// TODO move to a separate class, it should emit events on resize
	public contextFrame!: EditContextFrame
	public objectsFactory!: EditableObjectsFactory
	public layoutSystem!: LayoutSystem
	private componentsFactory!: EditableComponentsFactory
	private clipboard!: CanvasClipboard
	private aligner!: Aligner
	private baselineRootJson?: EditableContainerJson
	private isRestoringFromHistory = false

	public init(data: MainSceneInitData) {
		super.init(data)

		const clearConsole = urlParams.get('clearConsole') === 'scene'
		if (clearConsole) {
			console.clear()
		}

		this.logger = logger.getOrCreate('canvas')

		this.logger.info('MainScene init', data)

		this.sceneClickedAt = 0
	}

	private async applySnapshot(snapshot: CanvasDocumentSnapshot) {
		if (!snapshot.rootJson) {
			return
		}

		this.isRestoringFromHistory = true

		try {
			if (this.root) {
				this.root.destroy()
			}

			this.editContexts.reset()

			this.root = this.objectsFactory.fromJson(snapshot.rootJson, true) as EditableContainer
			this.superRoot.add(this.root)

			let targetContext: EditableContainer | undefined = this.root
			if (snapshot.activeContextId) {
				const obj = this.objectsFactory.getObjectById(snapshot.activeContextId)
				if (obj && isObjectOfType(obj, 'Container')) {
					targetContext = obj
				}
			}

			if (targetContext) {
				this.editContexts.switchTo(targetContext)
			}

			const context = this.editContexts.current
			if (context && snapshot.selectionIds?.length) {
				const selectableObjects = snapshot.selectionIds
					.map((id) => this.objectsFactory.getObjectById(id))
					.filter((obj): obj is EditableObject => Boolean(obj))
					.filter((obj) => obj.parentContainer === context.target)

				if (selectableObjects.length) {
					context.setSelection(selectableObjects)
				} else {
					context.cancelSelection()
				}
			} else if (context) {
				context.cancelSelection()
			}

			if (snapshot.camera) {
				const camera = this.cameras.main
				camera.setZoom(snapshot.camera.zoom)
				camera.setScroll(snapshot.camera.scrollX, snapshot.camera.scrollY)
				this.onResizeOrCameraChange()
			}

			state.canvas.root = this.root.stateObj
			state.canvas.objectById = (id: string) => this.objectsFactory.getObjectById(id)?.stateObj
			state.canvas.siblingIds = (id: string) => this.getObjectSiblingsIds(id)
			state.canvas.selection = snapshot.selectionIds ?? []
			state.canvas.activeContextId = snapshot.activeContextId

			this.updateUnsavedChanges()
		} finally {
			this.isRestoringFromHistory = false
		}
	}

	private updateUnsavedChanges() {
		if (!this.baselineRootJson) {
			state.canvas.hasUnsavedChanges = true
			return
		}

		const currentJson = this.rootToJson()
		state.canvas.hasUnsavedChanges = !deepEqual(currentJson, this.baselineRootJson)
	}

	private async pushCanvasHistory(label: string, before: CanvasDocumentSnapshot, after: CanvasDocumentSnapshot) {
		if (deepEqual(before.rootJson, after.rootJson)) {
			return
		}

		const prefabId = this.initData.prefabAsset.id

		this.undoHub.push({
			label,
			domains: ['canvas'],
			timestamp: Date.now(),
			isValid: () => state.canvas.currentPrefab?.id === prefabId,
			undo: async () => {
				await this.applySnapshot(before)
				this.updateUnsavedChanges()
			},
			redo: async () => {
				await this.applySnapshot(after)
				this.updateUnsavedChanges()
			},
		})

		this.updateUnsavedChanges()
	}

	/**
	 * Wraps a mutation function with undo/redo support.
	 * Captures snapshots before and after the operation and pushes them to the global UndoHub.
	 */
	private async withUndo<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
		if (this.isRestoringFromHistory) {
			return await fn()
		}

		const before = this.captureSnapshot()
		const result = await fn()
		const after = this.captureSnapshot()
		await this.pushCanvasHistory(label, before, after)
		return result
	}

	private get undoHub() {
		return (this.game as PhaserGameExtra).undoHub
	}

	private get currentPrefabId(): string | undefined {
		return this.initData?.prefabAsset.id ?? state.canvas.currentPrefab?.id
	}

	private get stateSelectionIds(): string[] {
		const selection = this.editContexts.current?.selection
		return selection ? selection.objects.map((obj) => obj.id) : []
	}

	private captureSnapshot(): CanvasDocumentSnapshot {
		return {
			rootJson: this.rootToJson(),
			activeContextId: this.editContexts.current?.target.id,
			selectionIds: this.stateSelectionIds,
			camera: {
				zoom: this.cameras.main.zoom,
				scrollX: this.cameras.main.scrollX,
				scrollY: this.cameras.main.scrollY,
			},
		}
	}

	/**
	 * TransformControls (resize/rotate/origin) mutates objects directly during pointer move,
	 * so we integrate undo/redo by capturing a snapshot on transform start and pushing history on transform end.
	 */
	public startTransformControlsUndo(type: 'rotate' | 'resize' | 'origin'): void {
		if (this.isRestoringFromHistory) {
			return
		}

		// guard against re-entrancy / overlapping transforms
		if (this.transformControlsSnapshot) {
			return
		}

		this.transformControlsSnapshot = { before: this.captureSnapshot(), type }
	}

	public stopTransformControlsUndo(): void {
		if (!this.transformControlsSnapshot) {
			return
		}

		const { before, type } = this.transformControlsSnapshot
		this.transformControlsSnapshot = undefined

		const label = match(type)
			.with('rotate', () => 'Rotate')
			.with('resize', () => 'Resize')
			.with('origin', () => 'Change origin')
			.exhaustive()

		const after = this.captureSnapshot()
		void this.pushCanvasHistory(label, before, after)
	}

	private rootToJson(): EditableContainerJson {
		return this.root.toJson()
	}

	public async create() {
		if (!this.initData) {
			throw new Error('MainScene.initData is not set')
		}

		this.grid = new Grid(this)
		this.grid.name = 'grid'
		this.add.existing(this.grid)

		this.rulers = new Rulers(this)
		this.rulers.name = 'rulers'
		this.add.existing(this.rulers)

		this.initComponentsFactory()

		this.initObjectsFactory()

		this.initLayoutSystem()

		this.initClipboard()

		this.initEditContexts()

		this.initSuperRoot(this.initData.project.config.size.width, this.initData.project.config.size.height)

		await this.initRoot(this.initData.prefabFile)

		state.canvas.currentPrefab = {
			id: this.initData.prefabAsset.id,
			name: this.initData.prefabAsset.name,
		}

		this.initAligner()

		this.addContextFrame(this.editContexts.current!)

		this.addKeyboadCallbacks()

		this.addPointerCallbacks()

		this.scale.on('resize', this.resize, this, this.shutdownSignal)

		const cameraState = state.canvas.camera
		const camera = this.cameras.main
		camera.setZoom(cameraState.zoom)
		camera.setScroll(cameraState.scrollX, cameraState.scrollY)

		this.onResizeOrCameraChange(this.scale.gameSize)

		const isDefaultCameraSettings = cameraState.zoom === 1 && cameraState.scrollX === 0 && cameraState.scrollY === 0
		if (isDefaultCameraSettings) {
			this.alignCameraToContextFrame()
		}

		this.setupAppCommands()

		state.canvas.root = this.root.stateObj
		state.canvas.objectById = (id: string) => this.objectsFactory.getObjectById(id)?.stateObj
		state.canvas.siblingIds = (id: string) => this.getObjectSiblingsIds(id)
		this.baselineRootJson = this.rootToJson()
		this.updateUnsavedChanges()

		subscribe(
			state.canvas.root,
			() => {
				if (this.isRestoringFromHistory) {
					return
				}
				this.updateUnsavedChanges()
			},
			{ signal: this.shutdownSignal }
		)
	}

	private initComponentsFactory() {
		this.componentsFactory = new EditableComponentsFactory({
			logger: this.logger.getSubLogger({ name: ':components-factory' }),
		})
	}

	private initObjectsFactory() {
		this.objectsFactory = new EditableObjectsFactory({
			scene: this,
			logger: this.logger.getSubLogger({ name: ':objects-factory' }),
			componentsFactory: this.componentsFactory,
		})

		this.objectsFactory.on(
			'obj-registered',
			(obj) => {
				if (!(obj instanceof EditableContainer)) {
					return
				}

				this.editContexts.add(obj, {
					switchTo: false,
					isRoot: obj.isRoot,
				})
			},
			this,
			this.shutdownSignal
		)
	}

	private initLayoutSystem() {
		this.layoutSystem = new LayoutSystem({
			scene: this,
			objectsFactory: this.objectsFactory,
			logger: this.logger.getSubLogger({ name: ':layout' }),
		})
	}

	private initClipboard() {
		this.clipboard = new CanvasClipboard(this, {
			logger: this.logger.getSubLogger({ name: ':clipboard' }),
			factory: this.objectsFactory,
		})
	}

	private initEditContexts() {
		this.editContexts = new EditContextsManager({
			scene: this,
			logger: this.logger.getSubLogger({ name: ':contexts' }),
		})

		this.editContexts.on(
			'selection-changed',
			(selection) => {
				const selectionIds = selection?.objects.map((obj) => obj.id) || []
				state.canvas.selection = selectionIds
				state.canvas.selectionChangedAt = Date.now()
			},
			this,
			this.shutdownSignal
		)

		this.editContexts.on('context-switched', this.onContextSwitched, this, this.shutdownSignal)
	}

	private onContextSwitched(context: EditContext): void {
		state.canvas.activeContextId = context.target.id

		if (this.contextFrame) {
			this.contextFrame.adjustTo(context)
		}
	}

	/**
	 * The sole purpose of the super root is to be the parent of the root object.
	 * So that the root object can be selected and edited via Inspector.
	 * @note The super root is not displayed in the hierarchy panel and not being exported to the prefab file.
	 */
	private initSuperRoot(width: number, height: number) {
		this.superRoot = this.objectsFactory.container('super-root')

		this.superRoot.setSize(width, height)

		// super root can only have one child
		this.superRoot.events.on('editable-added', (obj) => {
			if (this.superRoot.editables.length <= 1) {
				return
			}

			this.logger.warn(`super root can only have one child, destroying ${obj.name}`)

			// wait for the next frame to destroy the object
			this.events.once(Phaser.Scenes.Events.UPDATE, () => obj.destroy(), this, this.shutdownSignal)
		})

		this.add.existing(this.superRoot)
	}

	private async initRoot(prefabFile: PrefabFile) {
		let root: EditableContainer

		if (prefabFile.content) {
			await this.loadPrefabAssets(prefabFile.content)
			root = this.objectsFactory.fromJson(prefabFile.content, true) as EditableContainer
		} else {
			const name = getNameWithoutExtension(this.initData.prefabAsset)
			root = this.objectsFactory.container(name)
		}

		this.root = root
		this.superRoot.add(this.root)
		this.editContexts.switchTo(this.root)
	}

	private async loadPrefabAssets(content: EditableContainerJson) {
		const prefabAssets = this.calculatePrefabAssets(content)

		// TODO prefabs: load assets in parallel
		for (const assetDef of prefabAssets) {
			const asset = getAssetById(state.assets.items, assetDef.id) as AssetTreeItemDataOfType<typeof assetDef.type>
			if (!asset) {
				this.logger.warn(`failed to find ${assetDef.type} '${assetDef.name}' with id '${assetDef.id}'`)
				continue
			}

			await match(asset)
				.with({ type: 'image' }, async (image) => this.loadTexture(image))
				.with({ type: 'spritesheet-frame' }, async (frame) => this.loadSpritesheetFrame(frame))
				.with({ type: 'bitmap-font' }, async (bitmapFont) => this.loadBitmapFont(bitmapFont))
				.with({ type: 'web-font' }, async (webFont) => this.loadWebFont(webFont))
				.exhaustive()
		}
	}

	/**
	 * Calculates the assets that are needed to be loaded to display the prefab.
	 */
	private calculatePrefabAssets(prefabRoot: EditableContainerJson): PrefabAsset[] {
		const assetIds = new Set<string>()
		const assets: PrefabAsset[] = []

		const traverse = (object: EditableObjectJson) => {
			if (object.type === 'Container') {
				for (const child of object.children) {
					traverse(child)
				}

				return
			}

			// simplify - get rid of array
			const objectAssets = match(object)
				.returnType<PrefabAsset[]>()
				.with({ type: 'Image' }, (image) => [image.asset])
				.with({ type: 'Text' }, (text) => [text.asset])
				.with({ type: 'BitmapText' }, (bitmapText) => [bitmapText.asset])
				.with({ type: 'NineSlice' }, (nineSlice) => [nineSlice.asset])
				.exhaustive()

			for (const asset of objectAssets) {
				if (assetIds.has(asset.id)) {
					continue
				}

				assetIds.add(asset.id)
				assets.push(asset)
			}
		}

		traverse(prefabRoot)

		return assets
	}

	/**
	 * Saves the prefab to the file system.
	 */
	public async savePrefab(): Promise<Result<void, string>> {
		if (!state.canvas.hasUnsavedChanges) {
			this.logger.info(`no changes in '${this.initData.prefabAsset.name}', skipping save`)
			return ok(undefined)
		}

		const prefabFilePath = this.initData.prefabAsset.path

		const prefabContent = this.root.toJson()

		const prefabFile: PrefabFile = {
			content: prefabContent,
			assetPack: this.calculatePrefabAssetPack(),
		}

		const { error } = await until(() =>
			backend.writeJson({ path: prefabFilePath, content: prefabFile, options: { spaces: '\t' } })
		)
		if (error) {
			const errorLog = getErrorLog(error)
			this.logger.error(`failed to save '${this.initData.prefabAsset.name}' prefab (${errorLog})`)
			// TODO prefabs: show mantine notification
			return err(errorLog)
		}

		this.logger.info(`saved '${this.initData.prefabAsset.name}' at ${prefabFilePath}`)

		this.baselineRootJson = prefabContent
		state.canvas.hasUnsavedChanges = false

		return ok(undefined)
	}

	/**
	 * Calculates the asset pack for the prefab.
	 * @note Asset pack is used in RUNTIME, not in EDITOR.
	 */
	private calculatePrefabAssetPack(): PrefabFile['assetPack'] {
		// TODO prefabs: convert the assets to Phaser AssetPack
		// https://docs.phaser.io/api-documentation/class/loader-loaderplugin#pack

		return []
	}

	private selectAllInCurrentContext() {
		const context = this.editContexts.current
		if (!context) {
			return
		}

		context.setSelection(context.target.editables)
	}

	private initAligner() {
		this.aligner = new Aligner({
			scene: this,
			logger: this.logger.getSubLogger({ name: ':align' }),
		})

		const appCommands = (this.game as PhaserGameExtra).appCommands as AppCommandsEmitter
		appCommands.on(
			'align',
			(type) =>
				this.withUndo('Align', () => {
					const context = this.editContexts.current!
					const selection = context.selection
					if (!selection) {
						return
					}

					this.aligner.logger.debug(`aligning ${selection.objectsAsString} to ${type}`)

					const wasAligned = this.aligner.align(type, selection.objects, context)
					if (wasAligned) {
						selection.updateBounds()
					}
				}),
			this,
			false,
			this.shutdownSignal
		)
	}

	private addContextFrame(context: EditContext) {
		this.contextFrame = new EditContextFrame(this, context, {
			thickness: 1,
			color: 0xffffff,
		})

		this.add.existing(this.contextFrame)
	}

	private getNewObjectName(context: EditContext, objToName: EditableObject, prefix?: string): string {
		const _prefix = prefix ?? this.createNamePrefix(objToName)

		let n = 1
		let name = `${_prefix}`
		while (context.target.editables.some((item) => item.name === name)) {
			name = `${_prefix}_${++n}`
		}

		return name
	}

	private createNamePrefix(obj: EditableObject): string {
		if (!obj.name) {
			return match(obj)
				.with({ kind: 'Container' }, () => 'group')
				.otherwise((obj) => {
					return obj.asset.name.split('.').slice(0, -1).join('.')
				})
		}

		// if name has postfix like '_1', '_2', etc, remove it
		return obj.name.replace(/_\d+$/, '')
	}

	private getObjectSiblingsIds(objId: string): string[] {
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return []
		}

		const parent = obj.parentContainer
		if (parent && parent instanceof EditableContainer) {
			return parent.editables.map((item) => item.id)
		}

		return []
	}

	private setupAppCommands() {
		const signal = this.shutdownSignal

		const appCommands = (this.game as PhaserGameExtra).appCommands as AppCommandsEmitter

		appCommands.on('add-component', this.addComponent, this, false, signal)
		appCommands.on('remove-component', this.removeComponent, this, false, signal)
		appCommands.on('move-component-up', this.moveComponentUp, this, false, signal)
		appCommands.on('move-component-down', this.moveComponentDown, this, false, signal)
		appCommands.on('paste-component', this.pasteComponent, this, false, signal)
		appCommands.on('reset-image-original-size', this.resetImageOriginalSize, this, false, signal)
		appCommands.on('adjust-container-to-children-bounds', this.adjustContainerToChildrenBounds, this, false, signal)
		appCommands.on('set-camera', this.setCamera, this, false, signal)

		appCommands.on('handle-asset-drop', this.handleAssetDrop, this, false, signal)

		// handle selection
		appCommands.on('select-object', this.selectObject, this, false, signal)
		appCommands.on('select-objects', this.selectObjects, this, false, signal)
		appCommands.on('add-object-to-selection', this.addObjectToSelection, this, false, signal)
		appCommands.on('remove-object-from-selection', this.removeObjectFromSelection, this, false, signal)
		appCommands.on('clear-selection', this.clearSelection, this, false, signal)

		appCommands.on('switch-to-context', this.switchToContext, this, false, signal)
		appCommands.on('highlight-object', this.highlightObject, this, false, signal)
		appCommands.on('create-object', this.createObject, this, false, signal)
		appCommands.on('copy-object', this.copyObject, this, false, signal)
		appCommands.on('duplicate-object', this.duplicateObject, this, false, signal)
		appCommands.on('cut-object', this.cutObject, this, false, signal)
		appCommands.on('paste-object', this.pasteObject, this, false, signal)
		appCommands.on('delete-objects', this.deleteObjects, this, false, signal)
		appCommands.on('move-object-in-hierarchy', this.moveObjectInHierarchy, this, false, signal)
		appCommands.on('get-object-path', this.getObjectPath, this, false, signal)
		appCommands.on('save-prefab', this.savePrefab, this, false, signal)
		appCommands.on('discard-unsaved-prefab', this.restart, this, false, signal)

		appCommands.on('take-canvas-screenshot', this.takeCanvasScreenshot, this, false, signal)
	}

	private async takeCanvasScreenshot(options?: { clean?: boolean; format?: 'png' | 'jpg' | 'webp' }): Promise<string> {
		const prefabName = this.getPrefabNameForScreenshot()
		const timestamp = formatScreenshotTimestamp(new Date())
		const format = options?.format ?? 'png'
		const fileBase = sanitizeFileNamePart(`${timestamp}--${prefabName}`)
		const fileName = `${fileBase}.${format}`

		const targetDir = '/Users/vlad/dev/phaser-ui-editor/screenshots'

		const capture = async () => {
			const blob = await this.getRendererSnapshot(format)
			const arrayBuffer = await blob.arrayBuffer()
			const bytes = new Uint8Array(arrayBuffer)

			const result = await backend.saveScreenshot({
				targetDir,
				fileName,
				bytes,
			})

			this.logger.info(`saved canvas screenshot at ${result.path}`)
			return result.path
		}

		if (!options?.clean) {
			return await capture()
		}

		const context = this.editContexts.current
		if (!context) {
			return await capture()
		}

		return await context.withEditorOverlaysHidden(capture)
	}

	private getRendererSnapshot(format: 'png' | 'jpg' | 'webp' = 'png', quality = 1): Promise<Blob> {
		const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'

		return new Promise<Blob>((resolve, reject) => {
			// Phaser typings may not include 'image/webp', but runtime browsers generally support it.
			this.renderer.snapshot(
				(snapshot) => {
					if (!(snapshot instanceof HTMLImageElement)) {
						reject(new Error('Failed to capture renderer snapshot: invalid snapshot type'))
						return
					}

					void (async () => {
						try {
							const res = await fetch(snapshot.src)
							const blob = await res.blob()
							resolve(blob)
						} catch (error) {
							reject(error instanceof Error ? error : new Error(String(error)))
						}
					})()
				},
				mime as unknown as 'image/png',
				quality
			)
		})
	}

	private getPrefabNameForScreenshot(): string {
		const rawName = state.canvas.currentPrefab?.name
		if (!rawName) {
			return 'no-prefab'
		}

		const base = getPrefabBaseName(rawName)
		if (!base) {
			return 'no-prefab'
		}

		return base
	}

	private resetImageOriginalSize(data: { objectId: string }) {
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj || obj.kind !== 'Image') {
			return
		}

		const assets = state.assets.items
		const asset = getAssetById(assets, obj.asset.id)
		if (!asset || (asset.type !== 'image' && asset.type !== 'spritesheet-frame')) {
			return
		}

		const size = asset.size
		if (!size || size.w === 0 || size.h === 0) {
			return
		}

		void this.withUndo('Reset image original size', () => {
			obj.setDisplaySize(size.w, size.h)
			obj.setScale(1)
		})
	}

	private adjustContainerToChildrenBounds(data: { objectId: string }) {
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj || !isObjectOfType(obj, 'Container')) {
			return
		}

		const container = obj
		const children = container.editables
		if (children.length === 0) {
			return
		}

		const containerWorldMatrix = container.getWorldTransformMatrix()
		const tempVec = new Phaser.Math.Vector2()

		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity

		children.forEach((child) => {
			const bounds = getEditableWorldBounds(child)
			const left = bounds.left
			const right = bounds.right
			const top = bounds.top
			const bottom = bounds.bottom

			const corners = [
				[left, top],
				[right, top],
				[right, bottom],
				[left, bottom],
			]

			corners.forEach(([x, y]) => {
				const local = containerWorldMatrix.applyInverse(x, y, tempVec)
				minX = Math.min(minX, local.x)
				minY = Math.min(minY, local.y)
				maxX = Math.max(maxX, local.x)
				maxY = Math.max(maxY, local.y)
			})
		})

		if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
			return
		}

		const width = Math.max(0, maxX - minX)
		const height = Math.max(0, maxY - minY)
		const centerLocalX = (minX + maxX) * 0.5
		const centerLocalY = (minY + maxY) * 0.5
		const cos = Math.cos(container.rotation)
		const sin = Math.sin(container.rotation)
		const scaledX = centerLocalX * container.scaleX
		const scaledY = centerLocalY * container.scaleY
		const offsetX = scaledX * cos - scaledY * sin
		const offsetY = scaledX * sin + scaledY * cos

		if (isPositionLockedForRuntimeObject(container)) {
			return
		}

		if (children.some((child) => isPositionLockedForRuntimeObject(child))) {
			return
		}

		void this.withUndo('Adjust container to children bounds', () => {
			container.setPosition(container.x + offsetX, container.y + offsetY)
			children.forEach((child) => {
				child.setPosition(child.x - centerLocalX, child.y - centerLocalY)
			})
			container.setSize(width, height)

			const selection = this.editContexts.current?.selection
			if (selection && selection.objects.includes(container)) {
				selection.updateBounds()
			}
		})
	}

	private selectObject(objId: string) {
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		const context = this.editContexts.findParentContext(obj)
		if (!context) {
			return
		}

		this.editContexts.switchTo(context.target)

		context.setSelection([obj])
	}

	private selectObjects(objIds: string[]) {
		const objects = objIds.map((id) => this.objectsFactory.getObjectById(id)).filter(Boolean)
		if (!objects.length) {
			return
		}

		const context = this.editContexts.findParentContext(objects[0])
		if (!context) {
			return
		}

		const objsFromContext = objects.filter((obj) => obj.parentContainer === context.target)

		this.editContexts.switchTo(context.target)

		context.setSelection(objsFromContext)
	}

	private addObjectToSelection(objId: string) {
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		if (state.canvas.selection.includes(objId)) {
			return
		}

		if (state.canvas.selection.length === 0) {
			this.selectObject(objId)
			return
		}

		const selectedObj = this.objectsFactory.getObjectById(state.canvas.selection[0])
		if (!selectedObj) {
			return
		}

		if (obj.parentContainer !== selectedObj.parentContainer) {
			return
		}

		const selectionContext = this.editContexts.findParentContext(selectedObj)
		if (!selectionContext) {
			return
		}

		this.editContexts.switchTo(selectionContext.target)

		selectionContext.addToSelection([obj])
	}

	private removeObjectFromSelection(objId: string) {
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		if (!state.canvas.selection.includes(objId)) {
			return
		}

		if (state.canvas.selection.length === 0) {
			return
		}

		const selectedObj = this.objectsFactory.getObjectById(state.canvas.selection[0])
		if (!selectedObj) {
			return
		}

		if (obj.parentContainer !== selectedObj.parentContainer) {
			return
		}

		const selectionContext = this.editContexts.findParentContext(selectedObj)
		if (!selectionContext) {
			return
		}

		this.editContexts.switchTo(selectionContext.target)

		selectionContext.removeFromSelection([obj])
	}

	private clearSelection() {
		const context = this.editContexts.current
		if (!context) {
			return
		}

		context.cancelSelection()
	}

	private switchToContext(contextId: string) {
		const container = this.objectsFactory.getObjectById(contextId)
		if (!container || !isObjectOfType(container, 'Container')) {
			return
		}

		this.editContexts.switchTo(container)
	}

	private highlightObject(objId: string) {
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		const context = this.editContexts.findParentContext(obj)
		if (!context) {
			return
		}

		// TODO hierarchy: highlight object by command from hierarchy panel
		this.logger.info(`highlighting '${obj.name}' (${objId})`)
	}

	private createObject(data: { clickedObjId: string; type: EditableObjectType }) {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		const clickedObj = this.objectsFactory.getObjectById(data.clickedObjId)
		if (!clickedObj) {
			return
		}

		const editContext = isObjectOfType(clickedObj, 'Container')
			? this.editContexts.getContext(clickedObj)
			: this.editContexts.findParentContext(clickedObj)

		if (!editContext) {
			this.logger.error(`failed to find edit context for '${clickedObj.name}' (${clickedObj.id})`)
			return
		}

		const newObj = match(data.type)
			.with('Container', () => this.objectsFactory.container('group'))
			.with('Image', () => null)
			.with('Text', () => null)
			.with('BitmapText', () => null)
			.with('NineSlice', () => null)
			.exhaustive()

		if (!newObj) {
			return
		}

		const newObjName = this.getNewObjectName(editContext, newObj)
		newObj.setName(newObjName)

		this.editContexts.switchTo(editContext.target)

		editContext.target.add(newObj)

		editContext.setSelection([newObj])

		if (before) {
			void this.pushCanvasHistory('Create object', before, this.captureSnapshot())
		}
	}

	private copyObject(objId: string) {
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		// TODO implement
		this.logger.info(`copying '${obj.name}' (${objId})`)
	}

	private duplicateObject(objId: string) {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		const editContext = this.editContexts.findParentContext(obj)
		if (!editContext) {
			this.logger.error(`failed to find edit context for '${obj.name}' (${objId})`)
			return
		}

		const objJson = obj.toJson()

		const newObjName = this.getNewObjectName(editContext, obj)
		const newObj = this.objectsFactory.fromJson(objJson)
		newObj.setName(newObjName)
		newObj.setPosition(obj.x + 30, obj.y + 30)

		this.editContexts.switchTo(editContext.target)

		editContext.target.add(newObj)

		editContext.setSelection([newObj])

		if (before) {
			void this.pushCanvasHistory('Duplicate object', before, this.captureSnapshot())
		}
	}

	private cutObject(objId: string) {
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		// TODO implement
		this.logger.info(`cutting '${obj.name}' (${objId})`)
	}

	private pasteObject(objId: string) {
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		// TODO implement
		this.logger.info(`pasting '${obj.name}' (${objId})`)
	}

	private deleteObjects(objIds: string[]) {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		for (const objId of objIds) {
			const obj = this.objectsFactory.getObjectById(objId)
			if (!obj) {
				continue
			}

			if (obj === this.root) {
				this.logger.warn(`can't delete root object!`)
				continue
			}

			obj.destroy()
		}

		if (before) {
			void this.pushCanvasHistory('Delete objects', before, this.captureSnapshot())
		}
	}

	private moveObjectInHierarchy(objId: string, newParentId: string, newParentIndex: number) {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		if (objId === newParentId) {
			this.logger.warn(`can't move object to itself`)
			return
		}

		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		// parent has to be a container
		const newParent = this.objectsFactory.getObjectById(newParentId)
		if (!newParent || !isObjectOfType(newParent, 'Container')) {
			return
		}

		// check if new parent is NOT an ancestor of the object
		if (isObjectOfType(obj, 'Container')) {
			const parentsIds = this.calculateObjectParentsChain(newParent)
			if (parentsIds.includes(objId)) {
				this.logger.warn(
					`can't move '${obj.name}' (${objId}) to its ancestor '${newParent.name}' (${newParentId})`
				)
				return
			}
		}

		this.logger.info(
			`moving '${obj.name}' (${objId}) to index ${newParentIndex} in '${newParent.name}' (${newParentId})`
		)

		if (obj.parentContainer === newParent) {
			const currentIndex = obj.parentContainer.getIndex(obj)
			const newAdjustedIndex = currentIndex < newParentIndex ? newParentIndex - 1 : newParentIndex
			newParent.moveTo(obj, newAdjustedIndex)
		} else {
			newParent.addAt(obj, newParentIndex)
		}

		if (before) {
			void this.pushCanvasHistory('Move in hierarchy', before, this.captureSnapshot())
		}
	}

	private getObjectPath(objId: string): string {
		const obj = this.objectsFactory.getObjectById(objId)
		if (!obj) {
			return ''
		}

		const parentNames = this.calculateObjectParentsChain(obj).map((id) => {
			return this.objectsFactory.getObjectById(id)!.name
		})

		const pathParts = [obj.name].concat(parentNames).reverse()

		return pathParts.join('/')
	}

	/**
	 * Calculates the chain of parent objects from the given object to the root object.
	 * If object is located at `root/grid/top-row/obj`, the result will be `['top-row', 'grid', 'root']`.
	 * @note The chain is in reverse order, so the root object is the last element.
	 * @returns An array of object **ids** representing the chain of parents.
	 */
	private calculateObjectParentsChain(obj: EditableObject): string[] {
		const pathParts: string[] = []

		let currentParent = obj.parentContainer
		while (currentParent && currentParent !== this.root && currentParent instanceof EditableContainer) {
			pathParts.push(currentParent.id)
			currentParent = currentParent.parentContainer
		}

		return pathParts
	}

	private addComponent(data: { componentType: EditableComponentType; objectId: string }): AddComponentResult {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const component = this.componentsFactory.create(data.componentType)
		if (!component) {
			return err(`failed to create component '${data.componentType}'`)
		}

		const result = obj.components.add(component)

		if (before && result.isOk()) {
			void this.pushCanvasHistory('Add component', before, this.captureSnapshot())
		}

		return result
	}

	private removeComponent(data: { componentType: EditableComponentType; objectId: string }): RemoveComponentResult {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const result = obj.components.remove(data.componentType)

		if (before && result.isOk()) {
			void this.pushCanvasHistory('Remove component', before, this.captureSnapshot())
		}

		return result
	}

	private moveComponentUp(data: { componentType: EditableComponentType; objectId: string }): MoveComponentResult {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const result = obj.components.moveUp(data.componentType)

		if (before && result.isOk()) {
			void this.pushCanvasHistory('Move component up', before, this.captureSnapshot())
		}

		return result
	}

	private moveComponentDown(data: { componentType: EditableComponentType; objectId: string }): MoveComponentResult {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const result = obj.components.moveDown(data.componentType)

		if (before && result.isOk()) {
			void this.pushCanvasHistory('Move component down', before, this.captureSnapshot())
		}

		return result
	}

	private pasteComponent(data: { componentData: EditableComponentJson; objectId: string }): AddComponentResult {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const component = this.componentsFactory.fromJson(data.componentData)
		if (!component) {
			return err(`failed to create component '${data.componentData.type}'`)
		}

		const result = obj.components.add(component)

		if (before && result.isOk()) {
			void this.pushCanvasHistory('Paste component', before, this.captureSnapshot())
		}

		return result
	}

	/**
	 * Handles asset that was dropped from the Assets Panel on the canvas.
	 * @returns The created editable object or null if the object could not be created.
	 */
	private async handleAssetDrop(data: { asset: AssetTreeItemData; position: { x: number; y: number } }) {
		const before = this.isRestoringFromHistory ? null : this.captureSnapshot()
		// adding objects to super root is not allowed
		if (this.editContexts.current?.target === this.superRoot) {
			this.logger.warn(`adding objects to super root is not allowed`)
			return null
		}

		const obj = await this.createObjectFromAsset(data.asset)
		if (!obj) {
			return null
		}

		const name = this.getNewObjectName(this.editContexts.current!, obj)
		obj.setName(name)
		obj.setPosition(data.position.x, data.position.y)

		if ('setOrigin' in obj && typeof obj.setOrigin === 'function') {
			const origin =
				data.asset.type === 'spritesheet-frame' && data.asset.anchor ? data.asset.anchor : { x: 0.5, y: 0.5 }

			obj.setOrigin(origin.x, origin.y)
		}

		this.editContexts.current!.target.add(obj)

		if (before) {
			await this.pushCanvasHistory('Create from asset', before, this.captureSnapshot())
		}

		return obj
	}

	private createObjectFromAsset(asset: AssetTreeItemData) {
		return match(asset)
			.with({ type: 'image' }, async (image) => {
				let texture: Phaser.Textures.Texture | null = this.textures.get(image.id)
				if (!texture || texture.key === '__MISSING') {
					texture = await this.loadTexture(image)
				}

				if (!texture) {
					return null
				}

				// TODO support creation NineSlice from image assets if they have scale9Borders prop

				const imageAsset = createPrefabAsset<PrefabImageAsset>(image)
				return this.objectsFactory.image(imageAsset, texture.key)
			})
			.with({ type: 'spritesheet-frame' }, async (spritesheetFrame) => {
				let texture: Phaser.Textures.Texture | null = this.textures.get(spritesheetFrame.id)
				if (!texture || texture.key === '__MISSING') {
					texture = await this.loadSpritesheetFrame(spritesheetFrame)
				}

				if (!texture) {
					return null
				}

				if (spritesheetFrame.scale9Borders) {
					const frameWidth = spritesheetFrame.size.w
					const frameHeight = spritesheetFrame.size.h
					const { x, y, w, h } = spritesheetFrame.scale9Borders
					const nineScaleConfig: IPatchesConfig = {
						top: y,
						bottom: frameHeight - y - h,
						left: x,
						right: frameWidth - x - w,
					}

					const frameAsset = createPrefabAsset<PrefabSpritesheetFrameAsset>(spritesheetFrame)
					return this.objectsFactory.nineSlice(
						frameAsset,
						spritesheetFrame.size.w,
						spritesheetFrame.size.h,
						texture.key,
						spritesheetFrame.pathInHierarchy,
						nineScaleConfig
					)
				} else {
					const frameAsset = createPrefabAsset<PrefabSpritesheetFrameAsset>(spritesheetFrame)
					return this.objectsFactory.image(frameAsset, texture.key, spritesheetFrame.pathInHierarchy)
				}
			})
			.with({ type: 'web-font' }, async (webFontAsset) => {
				const font = await this.loadWebFont(webFontAsset)
				if (!font) {
					return null
				}

				const textAsset = createPrefabAsset<PrefabWebFontAsset>(webFontAsset)
				const text = this.objectsFactory.text(textAsset, font.familyName, {
					fontFamily: font.familyName,
					fontSize: '60px',
					color: '#ffffff',
				})
				text.setName(this.getNewObjectName(this.editContexts.current!, text, 'text'))
				return text
			})
			.with({ type: 'bitmap-font' }, async (bitmapFontAsset) => {
				const bmFontResult = await this.loadBitmapFont(bitmapFontAsset)
				if (!bmFontResult || bmFontResult.isErr()) {
					return null
				}

				const bmTextAsset = createPrefabAsset<PrefabBitmapFontAsset>(bitmapFontAsset)
				const bmFont = bmFontResult.value
				const bmTextContent = this.getBitmapFontChars(bmFont.data).replace(' ', '').slice(0, 10)
				const bmText = this.objectsFactory.bitmapText(bmTextAsset, bmFont.key, bmTextContent, bmFont.data.size)
				bmText.setName(this.getNewObjectName(this.editContexts.current!, bmText, 'bitmap-text'))
				return bmText
			})
			.with({ type: 'prefab' }, async (prefabAsset) => {
				const { error, data } = await until(() => backend.readJson({ path: prefabAsset.path }))
				if (error) {
					this.logger.error(`failed to load prefab file '${prefabAsset.path}' (${getErrorLog(error)})`)
					return null
				}

				// TODO prefabs: check if data is a valid prefab file (zod validation)
				const prefabFile = data as PrefabFile

				if (!prefabFile.content) {
					this.logger.error(`${prefabAsset.name} (${prefabAsset.id}) is empty`)
					return null
				}

				await this.loadPrefabAssets(prefabFile.content)

				// add prefab reference to the content
				const containerJson = { ...prefabFile.content, prefab: { id: prefabAsset.id, name: prefabAsset.name } }
				const conainer = this.objectsFactory.fromJson(containerJson) as EditableContainer

				return conainer
			})
			.otherwise(() => null)
	}

	private async loadTexture(asset: GraphicAssetData): Promise<Phaser.Textures.Texture | null> {
		const textureKey = getAssetRelativePath(asset.path)

		if (this.textures.exists(textureKey)) {
			return this.textures.get(textureKey)
		}

		const img = await this.createImgForTexture(asset)
		if (!img) {
			return null
		}

		this.textures.addImage(textureKey, img)

		return this.textures.get(textureKey)
	}

	private async loadSpritesheetFrame(asset: AssetTreeSpritesheetFrameData): Promise<Phaser.Textures.Texture | null> {
		const spritesheetId = asset.parentId!
		const spritesheetAsset = getAssetById(state.assets.items, spritesheetId)
		if (!spritesheetAsset) {
			return null
		}

		if (!isAssetOfType(spritesheetAsset, 'spritesheet')) {
			return null
		}

		const textureKey = getAssetRelativePath(spritesheetAsset.image.path)

		// TODO check if texture is an atlas
		if (this.textures.exists(textureKey)) {
			return this.textures.get(textureKey)
		}

		const img = await this.createImgForTexture(spritesheetAsset)
		if (!img) {
			return null
		}

		const json = await backend.readJson({ path: spritesheetAsset.json.path })
		if (!json) {
			return null
		}

		this.textures.addAtlas(textureKey, img, json)

		return this.textures.get(textureKey)
	}

	/**
	 * Creates an `<img>` element that will be used as a Phaser texture source.
	 * TODO return Result
	 */
	private async createImgForTexture(asset: GraphicAssetData): Promise<HTMLImageElement | null> {
		const imgUrl = await fetchImageUrl(asset)
		if (!imgUrl) {
			return null
		}

		return new Promise((resolve, reject) => {
			const img = new Image()
			img.onload = () => resolve(img)
			img.onerror = () => reject(new Error(`Failed to load image: ${asset.path}`))
			img.src = imgUrl
		})
	}

	private initWebFont_DEBUG(assetId: string): Promise<WebFontParsed | undefined> {
		const asset = getAssetById(state.assets.items, assetId)
		if (!asset) {
			this.logger.warn(`failed to find web font asset with id '${assetId}'`)
			return Promise.resolve(undefined)
		}

		if (!isAssetOfType(asset, 'web-font')) {
			this.logger.warn(`asset '${asset.name}' (${asset.id}) is not a web font asset (actual type: ${asset.type})`)
			return Promise.resolve(undefined)
		}

		return this.loadWebFont(asset)
	}

	private async loadWebFont(asset: AssetTreeWebFontData): Promise<WebFontParsed> {
		// it only supports WOFF, WOFF2 and TTF formats
		const webFontParsed = await backend.parseWebFont({ path: asset.path })
		const webFontCss = this.createWebFontCss(webFontParsed)
		document.head.appendChild(webFontCss)

		return new Promise<WebFontParsed>((resolve, reject) => {
			WebFont.load({
				custom: {
					families: [webFontParsed.familyName],
				},
				active: () => {
					this.logger.info(`web font loaded '${webFontParsed.familyName}'`)
					resolve(webFontParsed)
				},
				inactive: () => {
					this.logger.warn(`web font not loaded '${webFontParsed.familyName}'`)
					reject(new Error(`failed to load web font '${webFontParsed.familyName}'`))
				},
			})
		})
	}

	private createWebFontCss(webFontParsed: WebFontParsed) {
		const dataUrl = `data:font/${webFontParsed.type.toLowerCase()};base64,${webFontParsed.base64}`
		const content = `@font-face {
			font-family: '${webFontParsed.familyName}';
			src: url('${dataUrl}') format('${webFontParsed.type.toLowerCase()}');
			font-weight: normal;
			font-style: normal;
		}`

		const css = document.createElement('style')
		css.textContent = content
		return css
	}

	private async initBitmapFont_DEBUG(assetId: string) {
		const asset = getAssetById(state.assets.items, assetId)
		if (!asset) {
			return err(`failed to find asset with id '${assetId}'`)
		}

		if (!isAssetOfType(asset, 'bitmap-font')) {
			return err(`asset '${asset.name}' (${asset.id}) is not a bitmap font asset (actual type: ${asset.type})`)
		}

		return this.loadBitmapFont(asset)
	}

	private async loadBitmapFont(
		asset: AssetTreeBitmapFontData
	): Promise<Result<{ key: string; data: PhaserBmfontData }, string>> {
		const fontKey = asset.name

		let bmFont = this.sys.cache.bitmapFont.get(fontKey) as { data: PhaserBmfontData } | undefined
		if (bmFont) {
			return ok({ key: fontKey, ...bmFont })
		}

		const frameData = await this.getBitmapFontFrame(asset)
		if (frameData.isErr()) {
			return frameData
		}

		const data = await this.getBitmapFontData(asset, frameData.value.frame)
		if (data.isErr()) {
			return data
		}

		if (frameData.value.fromAtlas) {
			// prettier-ignore
			this.sys.cache.bitmapFont.add(fontKey, { data: data.value, texture: frameData.value.frame.texture.key, frame: frameData.value.frameKey, fromAtlas: true })
		} else {
			this.sys.cache.bitmapFont.add(fontKey, { data: data.value, texture: frameData.value.frame.texture.key })
		}

		bmFont = this.sys.cache.bitmapFont.get(fontKey) as { data: PhaserBmfontData }

		return ok({ key: fontKey, ...bmFont })
	}

	private async getBitmapFontFrame(asset: AssetTreeBitmapFontData) {
		const isFontFromAtlas = asset.imageExtra !== undefined
		if (isFontFromAtlas === false) {
			// load texture
			const texture = await this.loadTexture(asset.image)
			if (!texture) {
				return err('failed to load bitmap font texture')
			}

			return ok({
				// @ts-expect-error accessing Phaser texture internal frame map
				frame: texture.frames['__BASE'] as Phaser.Textures.Frame,
				fromAtlas: false as const,
			})
		}

		// TODO implement loading bitmap font frame from atlas
		// const atlasJson = asset.imageExtra?.atlas
		// const atlasTexture = this.textures.get(atlasJson.texture.path)
		// const fontFrame = ...
		return ok({
			// @ts-expect-error placeholder atlas frame until implemented
			frame: null as Phaser.Textures.Frame,
			frameKey: '',
			fromAtlas: true as const,
		})
	}

	private async getBitmapFontData(asset: AssetTreeBitmapFontData, frame: Phaser.Textures.Frame) {
		let data: PhaserBmfontData

		if (asset.data.type === 'json') {
			const dataJson = (await backend.readJson({ path: asset.data.path })) as BmFontData
			if (!dataJson) {
				return err('failed to load bitmap font json data')
			}

			data = parseJsonBitmapFont(dataJson, frame)
		} else {
			const dataXmlRaw = await backend.readText({ path: asset.data.path })
			if (!dataXmlRaw) {
				return err('failed to load bitmap font xml data')
			}

			const dataXml = new DOMParser().parseFromString(dataXmlRaw.content, 'text/xml')
			if (!dataXml) {
				return err('failed to load bitmap font xml data')
			}

			data = Phaser.GameObjects.BitmapText.ParseXMLBitmapFont(dataXml, frame)
		}

		return ok(data)
	}

	private getBitmapFontChars(data: PhaserBmfontData): string {
		return Object.keys(data.chars)
			.map((charCodeStr) => parseInt(charCodeStr))
			.map((charCode) => String.fromCharCode(charCode))
			.join('')
	}

	private addKeyboadCallbacks() {
		this.onKeyDown(
			'S',
			(event) => {
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault()
					this.savePrefab()
				}
			},
			this,
			this.shutdownSignal
		)

		this.onKeyDown(
			'A',
			(event) => {
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault()
					this.selectAllInCurrentContext()
				}
			},
			this,
			this.shutdownSignal
		)

		this.onKeyDown('R', this.restart, this, this.shutdownSignal)
		this.onKeyDown('F', this.alignCameraToContextFrame, this, this.shutdownSignal)

		this.onKeyDown('DELETE', this.removeSelection, this, this.shutdownSignal)
		this.onKeyDown('BACKSPACE', this.removeSelection, this, this.shutdownSignal)

		this.onKeyDown('LEFT', (e) => this.moveSelection(-1, 0, e), this, this.shutdownSignal)
		this.onKeyDown('RIGHT', (e) => this.moveSelection(1, 0, e), this, this.shutdownSignal)
		this.onKeyDown('UP', (e) => this.moveSelection(0, -1, e), this, this.shutdownSignal)
		this.onKeyDown('DOWN', (e) => this.moveSelection(0, 1, e), this, this.shutdownSignal)

		this.onKeyDown('OPEN_BRACKET', (event) => this.moveSelectionDownInHierarchy(event), this, this.shutdownSignal)
		this.onKeyDown('CLOSED_BRACKET', (event) => this.moveSelectionUpInHierarchy(event), this, this.shutdownSignal)

		this.onKeyDown('G', (event) => this.processGrouping(event), this, this.shutdownSignal)

		this.onKeyDown('X', (event) => this.cut(event), this, this.shutdownSignal)
		this.onKeyDown('C', (event) => this.copy(event), this, this.shutdownSignal)
		this.onKeyDown('V', (event) => this.paste(event), this, this.shutdownSignal)

		this.onKeyDown('ZERO', this.resetSelectionTransform, this, this.shutdownSignal)

		this.onKeyDown('ONE', () => this.setCameraZoom(1), this, this.shutdownSignal)
		this.onKeyDown('TWO', ({ shiftKey }) => this.setCameraZoom(shiftKey ? 0.5 : 2), this, this.shutdownSignal)
		this.onKeyDown('THREE', ({ shiftKey }) => this.setCameraZoom(shiftKey ? 0.25 : 4), this, this.shutdownSignal)
	}

	private processGrouping(event: KeyboardEvent) {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		const editContext = this.editContexts.current!
		if (!editContext) {
			return
		}

		const selected = editContext.selection
		if (!selected || selected.isEmpty) {
			return
		}

		const label = event.shiftKey ? 'Ungroup' : 'Group'
		void this.withUndo(label, () => {
			if (event.shiftKey) {
				this.ungroup(selected, editContext)
			} else {
				this.group(selected, editContext)
			}
		})

		event.preventDefault()
	}

	private group(selection: Selection, editContext: EditContext): EditableContainer {
		const name = this.getNewObjectName(editContext, selection.objects[0])
		const bounds =
			selection.objects.length === 1 ? this.aligner.getRotatedBounds(selection.objects[0]) : selection.bounds
		const group = this.objectsFactory.container(name)
		group.setPosition(bounds.centerX, bounds.centerY)
		group.setSize(bounds.width, bounds.height)
		editContext.target.add(group)

		this.logger.debug(`grouped ${selection.objectsAsString} -> '${group.name}'`)

		selection.objects.forEach((obj) => {
			group.add(obj)
			obj.x -= group.x
			obj.y -= group.y
		})
		selection.destroy()

		editContext.selection = editContext.createSelection([group])
		editContext.transformControls.startFollow(editContext.selection)

		return group
	}

	private ungroup(selection: Selection, editContext: EditContext) {
		const groups = selection.objects.filter((obj) => obj instanceof EditableContainer)
		if (groups.length === 0) {
			return
		}

		const ungrouped = groups.flatMap((group) => {
			const sin = Math.sin(group.rotation)
			const cos = Math.cos(group.rotation)

			group.components.deactivateAll()

			const ungrouped = group.editables.map((child) => {
				// Calculate new position accounting for group angle and scale
				const dx = child.x * group.scaleX
				const dy = child.y * group.scaleY
				const rotatedX = dx * cos - dy * sin
				const rotatedY = dx * sin + dy * cos

				child.x = group.x + rotatedX
				child.y = group.y + rotatedY
				child.angle += group.angle
				child.scaleX *= group.scaleX
				child.scaleY *= group.scaleY
				editContext.target.add(child)
				return child
			})

			group.destroy()

			this.logger.debug(
				`ungrouped '${group.name}' -> [${ungrouped.map((obj) => obj.name || 'item').join(', ')}] (${ungrouped.length})`
			)

			return ungrouped
		})

		editContext.selection = editContext.createSelection(ungrouped)
		editContext.transformControls.startFollow(editContext.selection)

		return ungrouped
	}

	private copy(event: KeyboardEvent): void {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		const selection = this.editContexts.current?.selection
		if (!selection) {
			return
		}

		this.clipboard.copy(selection.objects)

		event.preventDefault()
	}

	private cut(event: KeyboardEvent): void {
		void this.withUndo('Cut', () => {
			this.copy(event)
			this.removeSelection()
		})
	}

	private paste(event: KeyboardEvent): void {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		// pasting on super root is not allowed
		if (this.editContexts.current?.target === this.superRoot) {
			this.logger.warn(`adding objects to super root is not allowed`)
			return
		}

		void this.withUndo('Paste', () => {
			const copiedObjs = this.clipboard.paste()
			if (!copiedObjs) {
				return
			}

			const editContext = this.editContexts.current!

			copiedObjs.forEach((obj) => {
				const name = this.getNewObjectName(editContext, obj)
				obj.setName(name)
				obj.setPosition(obj.x + 30, obj.y + 30)
				editContext.target.add(obj)
				this.logger.debug(`pasted '${name}'`)
			})

			editContext.selection?.destroy()
			editContext.selection = editContext.createSelection(copiedObjs)
			editContext.transformControls.startFollow(editContext.selection)
		})

		event.preventDefault()
	}

	public restart() {
		this.scene.restart(this.initData)
	}

	private removeSelection(): void {
		const selection = this.editContexts.current?.selection
		if (!selection) {
			return
		}

		void this.withUndo('Delete objects', () => {
			// create a copy of the objects array bc obj.destroy() will remove it from the original array `selection.objects`
			selection.objects.slice(0).forEach((obj) => {
				// delete it like this to trigger removeHandler in EditableContainer
				obj.parentContainer.remove(obj, true)
			})
		})
	}

	private moveSelection(dx: number, dy: number = 0, event: KeyboardEvent): void {
		const selected = this.editContexts.current?.selection
		if (!selected) {
			return
		}

		void this.withUndo('Move', () => {
			selected.move(dx * (event.shiftKey ? 10 : 1), dy * (event.shiftKey ? 10 : 1))
		})

		event.preventDefault()
	}

	private moveSelectionDownInHierarchy(event: KeyboardEvent) {
		const selected = this.editContexts.current?.selection
		if (!selected) {
			return
		}

		void this.withUndo('Move down in hierarchy', () => {
			selected.objects.forEach((obj) => {
				if (event.shiftKey) {
					obj.parentContainer.sendToBack(obj)
				} else {
					obj.parentContainer.moveDown(obj)
				}
			})
		})
	}

	private moveSelectionUpInHierarchy(event: KeyboardEvent) {
		const selected = this.editContexts.current?.selection
		if (!selected) {
			return
		}

		void this.withUndo('Move up in hierarchy', () => {
			selected.objects.forEach((obj) => {
				if (event.shiftKey) {
					obj.parentContainer.bringToTop(obj)
				} else {
					obj.parentContainer.moveUp(obj)
				}
			})
		})
	}

	private addPointerCallbacks() {
		this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onPointerWheel, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.GAME_OUT, this.onPointerGameOut, this, this.shutdownSignal)
	}

	private onPointerDown(pointer: Phaser.Input.Pointer, objectsUnderPointer: Phaser.GameObjects.GameObject[]): void {
		const buttonType = this.getButtonType(pointer)

		match(buttonType)
			.with('left', () => {
				const clickedOnTransformControl = objectsUnderPointer.some((obj) => obj.getData(TransformControls.TAG))
				if (clickedOnTransformControl) {
					// this.logger.debug('clicked on transform control')
					return
				}

				const context = this.editContexts.current!
				if (!context) {
					return
				}

				const selection = context.selection
				if (selection) {
					const startDrag =
						selection.objects.length === 1
							? objectsUnderPointer.some((obj) => obj === selection.objects[0])
							: selection.bounds.contains(pointer.worldX, pointer.worldY)

					if (startDrag) {
						this.startSelectionDrag(selection, pointer, context)
						return
					}
				}

				objectsUnderPointer.some((obj) => {
					if (context.isRegistered(obj) && context.selection?.includes(obj)) {
						this.startSelectionDrag(context.selection, pointer, context)
						return true
					}
				})

				const wasProcessedByContext = objectsUnderPointer.some((obj) => {
					if (context.isRegistered(obj)) {
						return true
					}
				})

				if (wasProcessedByContext) {
					return
				}

				context.cancelSelection()

				const msSinceLastClick = Date.now() - (this.sceneClickedAt ?? 0)
				if (msSinceLastClick < 200) {
					const parentContext = this.editContexts.findParentContext(context.target)
					if (parentContext) {
						this.editContexts.switchTo(parentContext.target)
					} else {
						this.editContexts.switchTo(this.superRoot)
					}
				}
				this.sceneClickedAt = Date.now()

				this.startDrawingSelectionRect(context, pointer)
			})
			.with('middle', () => this.startCameraDrag(pointer))
			.with('right', () => console.log('right button click'))
			.exhaustive()
	}

	private startDrawingSelectionRect(selection: EditContext, pointer: Phaser.Input.Pointer) {
		const pointerUpSignal = signalFromEvent(this.input, Phaser.Input.Events.POINTER_UP)

		const selectionRect = selection.selectionRect

		const drawFrom = { x: pointer.worldX, y: pointer.worldY }

		let setupWasCalled = false
		const setup = once(() => {
			selectionRect.revive()
			selectionRect.resetBounds()
			selection.setHoverMode('selection-rect')
			setupWasCalled = true
		})

		this.input.on(
			Phaser.Input.Events.POINTER_MOVE,
			(pointer: Phaser.Input.Pointer) => {
				// setup will be called only on the first pointer move
				setup()

				// the rest will be called on every pointer move
				selectionRect.draw(drawFrom, { x: pointer.worldX, y: pointer.worldY })
			},
			this,
			AbortSignal.any([this.shutdownSignal, pointerUpSignal])
		)

		this.input.once(
			Phaser.Input.Events.POINTER_UP,
			() => {
				if (setupWasCalled === false) {
					return
				}

				// it is a hacky way to get the objects under selection rect but it works
				const objectsUnderSelectionRect = selection.objectsUnderSelectionRect.slice()
				selection.objectsUnderSelectionRect.length = 0

				selection.cancelSelection()

				if (objectsUnderSelectionRect.length > 0) {
					selection.selection = selection.createSelection(objectsUnderSelectionRect)
					selection.transformControls.startFollow(selection.selection)
				}

				selectionRect.kill()

				selection.setHoverMode('normal')
			},
			this,
			this.shutdownSignal
		)
	}

	private onPointerUp(pointer: Phaser.Input.Pointer): void {
		if (this.getButtonType(pointer) === 'middle') {
			this.stopCameraDrag()
			return
		}

		if (this.getButtonType(pointer) === 'left') {
			this.stopSelectionDrag(this.editContexts.current!)
		}
	}

	private startCameraDrag(pointer: Phaser.Input.Pointer) {
		if (this.cameraDrag) {
			return
		}

		this.cameraDrag = true
		this.cameraDragStart = { x: pointer.x, y: pointer.y }

		this.game.canvas.style.cursor = 'grabbing'
	}

	private stopCameraDrag() {
		if (!this.cameraDrag) {
			return
		}

		this.cameraDrag = false
		this.cameraDragStart = undefined

		this.game.canvas.style.cursor = 'default'
	}

	public startSelectionDrag(selection: Selection, pointer: Phaser.Input.Pointer, context: EditContext) {
		if (this.selectionDrag) {
			return
		}

		if (selection.objects.some((obj) => isPositionLockedForRuntimeObject(obj))) {
			return
		}

		if (!this.isRestoringFromHistory) {
			this.selectionDragSnapshot = this.captureSnapshot()
		}

		const camera = this.cameras.main
		const { x, y } = pointer.positionToCamera(camera) as Phaser.Math.Vector2
		this.selectionDrag = {
			target: selection,
			currentX: selection.x,
			currentY: selection.y,
			offsetX: selection.x - x,
			offsetY: selection.y - y,
			lockAxis: 'none',
		}

		context.onDragStart(selection)
	}

	private stopSelectionDrag(editContext: EditContext) {
		if (!this.selectionDrag) {
			return
		}

		editContext.onDragEnd(this.selectionDrag.target)

		this.selectionDrag = undefined

		if (this.selectionDragSnapshot) {
			const after = this.captureSnapshot()
			void this.pushCanvasHistory('Move', this.selectionDragSnapshot, after)
			this.selectionDragSnapshot = undefined
		}
	}

	private onPointerMove(pointer: Phaser.Input.Pointer): void {
		if (this.cameraDrag && this.cameraDragStart) {
			const dx = pointer.x - this.cameraDragStart.x
			const dy = pointer.y - this.cameraDragStart.y

			const camera = this.cameras.main
			camera.scrollX -= dx / camera.zoom
			camera.scrollY -= dy / camera.zoom
			this.cameraDragStart = { x: pointer.x, y: pointer.y }
			this.onResizeOrCameraChange()
		}

		if (this.selectionDrag) {
			const camera = this.cameras.main
			const { x, y } = pointer.positionToCamera(camera) as Phaser.Math.Vector2

			if (this.selectionDrag.lockAxis === 'x') {
				this.selectionDrag.target.move(x + this.selectionDrag.offsetX - this.selectionDrag.currentX, 0)
			} else if (this.selectionDrag.lockAxis === 'y') {
				this.selectionDrag.target.move(0, y + this.selectionDrag.offsetY - this.selectionDrag.currentY)
			} else {
				this.selectionDrag.target.move(
					x + this.selectionDrag.offsetX - this.selectionDrag.currentX,
					y + this.selectionDrag.offsetY - this.selectionDrag.currentY
				)
			}

			this.selectionDrag.currentX = this.selectionDrag.target.x
			this.selectionDrag.currentY = this.selectionDrag.target.y
		}
	}

	private getButtonType(pointer: Phaser.Input.Pointer): 'left' | 'middle' | 'right' {
		return pointer.button === 0 ? 'left' : pointer.button === 1 ? 'middle' : 'right'
	}

	private onPointerWheel(
		pointer: Phaser.Input.Pointer,
		objects: Phaser.GameObjects.GameObject[],
		dx: number,
		dy: number
	): void {
		const camera = this.cameras.main

		const factor = pointer.event.ctrlKey || pointer.event.metaKey ? 1.3 : 1.1
		let newZoom = camera.zoom

		const direction = Phaser.Math.Sign(dy) * -1
		if (direction > 0) {
			// Zooming in
			newZoom *= factor
		} else {
			// Zooming out
			newZoom /= factor
		}

		newZoom = Phaser.Math.Clamp(newZoom, 0.05, 30)
		newZoom = Phaser.Math.RoundTo(newZoom, -2)

		this.zoomToPointer(newZoom, pointer)

		this.onResizeOrCameraChange(this.scale.gameSize)
	}

	private zoomToPointer(newZoom: number, pointer: Phaser.Input.Pointer): void {
		const camera = this.cameras.main

		const pointerPosBeforeZoom = pointer.positionToCamera(camera) as Phaser.Math.Vector2

		// Change the camera zoom
		camera.zoom = newZoom

		// hack to update the camera matrix and get the new pointer position
		// @ts-expect-error Phaser camera exposes preRender at runtime
		camera.preRender()

		const pointerPosAfterZoom = pointer.positionToCamera(camera) as Phaser.Math.Vector2

		// Adjust camera position to keep the pointer in the same world position
		camera.scrollX -= pointerPosAfterZoom.x - pointerPosBeforeZoom.x
		camera.scrollY -= pointerPosAfterZoom.y - pointerPosBeforeZoom.y
	}

	private resetSelectionTransform(): void {
		const selection = this.editContexts.current?.selection
		if (!selection) {
			return
		}

		void this.withUndo('Reset transform', () => {
			selection.objects.forEach((obj) => {
				obj.setRotation(0)
				obj.setScale(1)
			})

			selection.updateBounds()
		})
	}

	private setCameraZoom(zoom: number): void {
		this.cameras.main.zoom = zoom
		this.onResizeOrCameraChange(this.scale.gameSize)
	}

	private setCamera(params: { zoom?: number; scrollX?: number; scrollY?: number }): void {
		const { zoom, scrollX, scrollY } = params
		if (zoom == null && scrollX == null && scrollY == null) {
			return
		}

		const camera = this.cameras.main

		if (zoom != null) {
			camera.setZoom(zoom)
		}

		if (scrollX != null || scrollY != null) {
			const nextScrollX = scrollX ?? camera.scrollX
			const nextScrollY = scrollY ?? camera.scrollY
			camera.setScroll(nextScrollX, nextScrollY)
		}

		this.onResizeOrCameraChange(this.scale.gameSize)
	}

	private onPointerGameOut(): void {}

	public resize(): void {
		super.resize()

		this.onResizeOrCameraChange(this.scale.gameSize)
	}

	private onResizeOrCameraChange(gameSize?: Phaser.Structs.Size) {
		gameSize ??= this.scale.gameSize

		const camera = this.cameras.main
		this.grid.redraw(gameSize, camera, camera.scrollX, camera.scrollY)
		this.rulers.redraw(gameSize, camera.zoom, camera.scrollX, camera.scrollY)

		state.canvas.camera.zoom = camera.zoom
		state.canvas.camera.scrollX = camera.scrollX
		state.canvas.camera.scrollY = camera.scrollY
	}

	private alignCameraToContextFrame() {
		const camera = this.cameras.main

		const contextSize = this.contextFrame.aabbSize

		// center camera to (0, 0)
		camera.scrollX = -camera.width / 2
		camera.scrollY = -camera.height / 2

		const zoomPaddingX = camera.width * 0.1
		const zoomPaddingY = camera.height * 0.1

		const currentZoom = camera.zoom
		let newZoom = Math.min(
			camera.width / (contextSize.width + zoomPaddingX),
			camera.height / (contextSize.height + zoomPaddingY)
		)

		if (Phaser.Math.Fuzzy.Equal(newZoom, currentZoom)) {
			newZoom /= 2
		}

		camera.zoom = newZoom

		this.onResizeOrCameraChange()
	}

	public update(time: number, deltaMs: number): void {
		this.editContexts.update(deltaMs)
	}

	public onShutdown(): void {
		this.logger.debug(`${this.scene.key} shutdown - start`)

		super.onShutdown()

		this.editContexts.destroy()

		this.clipboard?.destroy()
		// @ts-expect-error clipboard cleared on shutdown to break references
		this.clipboard = undefined

		state.canvas.root = null
		state.canvas.objectById = () => undefined
		state.canvas.siblingIds = () => []
		state.canvas.currentPrefab = undefined

		this.objectsFactory.destroy()

		this.componentsFactory.destroy()

		this.logger.debug(`${this.scene.key} shutdown - complete`)
	}
}
