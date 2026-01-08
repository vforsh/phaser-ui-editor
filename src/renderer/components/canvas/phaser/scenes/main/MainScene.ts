import { logger } from '@logs/logs'
import { state } from '@state/State'
import { UrlParams } from '@url-params'
import { ILogObj, Logger } from 'tslog'

import { AppCommandsEmitter } from '../../../../../AppCommands'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { Aligner, type AlignType } from './Aligner'
import { CanvasClipboard } from './CanvasClipboard'
import { ContextDimming } from './ContextDimming'
import { EditContext } from './editContext/EditContext'
import { EditContextsManager } from './editContext/EditContextsManager'
import { Selection } from './editContext/Selection'
import { EditContextFrame } from './EditContextFrame'
import { Grid } from './Grid'
import { LayoutSystem } from './layout/LayoutSystem'
import { MainSceneAssetLoader } from './mainScene/MainSceneAssetLoader'
import { MainSceneCamera } from './mainScene/MainSceneCamera'
import { MainSceneHistory, TransformType } from './mainScene/MainSceneHistory'
import { MainSceneKeyboardInput } from './mainScene/MainSceneKeyboardInput'
import { MainScenePointerInput } from './mainScene/MainScenePointerInput'
import { MainScenePrefabPersistence } from './mainScene/MainScenePrefabPersistence'
import { MainSceneScreenshot } from './mainScene/MainSceneScreenshot'
import { MainSceneOps } from './mainScene/MainSceneSelectionOps'
import { MainSceneDeps, MainSceneInitData } from './mainScene/mainSceneTypes'
import { EditableComponentsFactory } from './objects/components/base/EditableComponentsFactory'
import { EditableContainer, EditableContainerJson } from './objects/EditableContainer'
import { EditableObjectsFactory } from './objects/EditableObjectsFactory'
import { Rulers } from './Rulers'

export class MainScene extends BaseScene {
	declare public initData: MainSceneInitData
	private deps!: MainSceneDeps
	private screenshot!: MainSceneScreenshot
	private cameraService!: MainSceneCamera
	private history!: MainSceneHistory
	private assetLoader!: MainSceneAssetLoader
	private persistence!: MainScenePrefabPersistence
	private ops!: MainSceneOps
	private keyboardInput!: MainSceneKeyboardInput
	private pointerInput!: MainScenePointerInput
	private logger!: Logger<ILogObj>
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
	private contextDimming?: ContextDimming

	public init(data: MainSceneInitData) {
		super.init(data)

		const clearConsole = UrlParams.get('clearConsole') === 'scene'
		if (clearConsole) {
			console.clear()
		}

		this.logger = logger.getOrCreate('canvas')

		this.logger.info('MainScene init', data)
	}

	public startTransformControlsUndo(type: TransformType): void {
		this.history.startTransformControlsUndo(type)
	}

	public stopTransformControlsUndo(): void {
		this.history.stopTransformControlsUndo()
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

		this.deps = {
			scene: this,
			logger: this.logger,
			shutdownSignal: this.shutdownSignal,
			grid: this.grid,
			rulers: this.rulers,
			editContexts: this.editContexts,
			contextFrame: this.contextFrame,
			objectsFactory: this.objectsFactory,
			componentsFactory: this.componentsFactory,
			layoutSystem: this.layoutSystem,
			clipboard: this.clipboard,
			sceneInitData: this.initData,
			getRoot: () => this.root,
			setRoot: (root) => (this.root = root),
			getSuperRoot: () => this.superRoot,
			onResizeOrCameraChange: () => this.onResizeOrCameraChange(),
			rootToJson: () => this.rootToJson(),
			getObjectSiblingsIds: (id) => this.getObjectSiblingsIds(id),
			restart: () => this.restart(),
			assetLoader: undefined as any, // to be filled
			history: undefined as any, // to be filled
			aligner: undefined as any, // to be filled
			cameraService: undefined as any, // to be filled
			ops: undefined as any, // to be filled
			persistence: undefined as any, // to be filled
			screenshot: undefined as any, // to be filled
		}

		this.assetLoader = new MainSceneAssetLoader(this.deps)
		this.deps.assetLoader = this.assetLoader

		this.history = new MainSceneHistory(this.deps)
		this.deps.history = this.history

		this.persistence = new MainScenePrefabPersistence(this.deps)
		this.deps.persistence = this.persistence

		this.ops = new MainSceneOps(this.deps)
		this.deps.ops = this.ops

		this.screenshot = new MainSceneScreenshot(this.deps)
		this.deps.screenshot = this.screenshot

		this.cameraService = new MainSceneCamera(this.deps)
		this.deps.cameraService = this.cameraService

		this.keyboardInput = new MainSceneKeyboardInput(this.deps)
		this.pointerInput = new MainScenePointerInput(this.deps)
		this.keyboardInput.install()
		this.pointerInput.install()

		await this.persistence.initRoot(this.initData.prefabFile)

		state.canvas.currentPrefab = {
			id: this.initData.prefabAsset.id,
			name: this.initData.prefabAsset.name,
		}
		state.canvas.recentPrefabs = [
			{
				assetId: this.initData.prefabAsset.id,
				name: this.initData.prefabAsset.name,
				lastOpenedAt: Date.now(),
			},
			...state.canvas.recentPrefabs.filter((prefab) => prefab.assetId !== this.initData.prefabAsset.id),
		].slice(0, 5)

		this.initAligner()
		this.deps.aligner = this.aligner

		this.addContextFrame(this.editContexts.current!)

		this.contextDimming = new ContextDimming({
			logger: this.logger,
			editContexts: this.editContexts,
			getSuperRoot: () => this.superRoot,
			grid: this.grid,
			rulers: this.rulers,
			contextFrame: this.contextFrame,
			shutdownSignal: this.shutdownSignal,
		})
		this.contextDimming.install()

		this.scale.on('resize', this.resize, this, this.shutdownSignal)

		const cameraState = state.canvas.camera
		const camera = this.cameras.main
		camera.setZoom(cameraState.zoom)
		camera.setScroll(cameraState.scrollX, cameraState.scrollY)

		this.onResizeOrCameraChange(this.scale.gameSize)

		const isDefaultCameraSettings = cameraState.zoom === 1 && cameraState.scrollX === 0 && cameraState.scrollY === 0
		if (isDefaultCameraSettings) {
			this.cameraService.alignToContextFrame()
		}

		this.setupAppCommands()

		// New document: reset revision counters (state is persisted across sessions).
		state.canvas.documentRevision = 0
		state.canvas.baselineDocumentRevision = 0

		state.canvas.root = this.root.stateObj
		state.canvas.objectById = (id: string) => this.objectsFactory.getObjectById(id)?.stateObj
		state.canvas.siblingIds = (id: string) => this.getObjectSiblingsIds(id)
		this.history.setBaseline()

		// Signal "scene is ready" for automation/control-rpc callers.
		state.canvas.mainSceneReadyPrefabAssetId = this.initData.prefabAsset.id
		state.canvas.mainSceneReadyAt = Date.now()
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
			this.shutdownSignal,
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
			this.shutdownSignal,
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

	/**
	 * Saves the prefab to the file system.
	 */
	private initAligner() {
		this.aligner = new Aligner({
			scene: this,
			logger: this.logger.getSubLogger({ name: ':align' }),
		})

		const appCommands = (this.game as PhaserGameExtra).appCommands as AppCommandsEmitter
		appCommands.on('align', this.handleAlignCommand, this, false, this.shutdownSignal)
	}

	private async handleAlignCommand(type: AlignType) {
		await this.history.withUndo('Align', () => {
			const context = this.editContexts.current
			if (!context) {
				return
			}

			const selection = context.selection
			if (!selection) {
				return
			}

			this.aligner.logger.debug(`aligning ${selection.objectsAsString} to ${type}`)

			const wasAligned = this.aligner.align(type, selection.objects, context)
			if (!wasAligned) {
				return
			}

			selection.updateBounds()
		})
	}

	private addContextFrame(context: EditContext) {
		this.contextFrame = new EditContextFrame(this, context, {
			thickness: 1,
			color: 0xffffff,
		})

		this.add.existing(this.contextFrame)

		// `deps` is constructed before `contextFrame` exists, so we must patch it in once created.
		// This keeps downstream services (e.g. camera alignment) from reading an `undefined` frame.
		if (this.deps) {
			this.deps.contextFrame = this.contextFrame
		}
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

		appCommands.on('add-component', (data) => this.ops.addComponent(data), this, false, signal)
		appCommands.on('remove-component', (data) => this.ops.removeComponent(data), this, false, signal)
		appCommands.on('move-component-up', (data) => this.ops.moveComponentUp(data), this, false, signal)
		appCommands.on('move-component-down', (data) => this.ops.moveComponentDown(data), this, false, signal)
		appCommands.on('paste-component', (data) => this.ops.pasteComponent(data), this, false, signal)
		appCommands.on('reset-image-original-size', (data) => this.ops.resetImageOriginalSize(data), this, false, signal)
		appCommands.on('adjust-container-to-children-bounds', (data) => this.ops.adjustContainerToChildrenBounds(data), this, false, signal)
		appCommands.on('set-camera', (params) => this.cameraService.setCamera(params), this, false, signal)
		appCommands.on('focus-on-object', (id) => this.cameraService.focusOnObject(id), this, false, signal)

		appCommands.on('handle-asset-drop', (data) => this.ops.handleAssetDrop(data), this, false, signal)

		// handle selection
		appCommands.on('select-object', (id) => this.ops.selectObject(id), this, false, signal)
		appCommands.on('select-objects', (ids) => this.ops.selectObjects(ids), this, false, signal)
		appCommands.on('add-object-to-selection', (id) => this.ops.addObjectToSelection(id), this, false, signal)
		appCommands.on('remove-object-from-selection', (id) => this.ops.removeObjectFromSelection(id), this, false, signal)
		appCommands.on('clear-selection', () => this.ops.clearSelection(), this, false, signal)

		appCommands.on('switch-to-context', (id) => this.ops.switchToContext(id), this, false, signal)
		appCommands.on('highlight-object', (id) => this.ops.highlightObject(id), this, false, signal)
		appCommands.on('create-object', (data) => this.ops.createObject(data), this, false, signal)
		appCommands.on('create-graphics-at', (data) => this.ops.createGraphicsAt(data), this, false, signal)
		appCommands.on('duplicate-object', (id) => this.ops.duplicateObject(id), this, false, signal)
		appCommands.on('delete-objects', (ids) => this.ops.deleteObjects(ids), this, false, signal)
		appCommands.on(
			'move-object-in-hierarchy',
			(id, parentId, parentIndex) => this.ops.moveObjectInHierarchy(id, parentId, parentIndex),
			this,
			false,
			signal,
		)
		appCommands.on('get-object-path', (id) => this.ops.getObjectPath(id), this, false, signal)
		appCommands.on('save-prefab', () => this.persistence.savePrefab(), this, false, signal)
		appCommands.on('discard-unsaved-prefab', this.restart, this, false, signal)

		appCommands.on('take-canvas-screenshot', (options) => this.screenshot.take(options), this, false, signal)
	}

	public restart() {
		this.scene.restart(this.initData)
	}

	public startSelectionDrag(selection: Selection, pointer: Phaser.Input.Pointer, context: EditContext) {
		this.pointerInput.startSelectionDrag(selection, pointer, context)
	}

	public resize(): void {
		super.resize()

		this.cameraService.onResizeOrCameraChange(this.scale.gameSize)
	}

	private onResizeOrCameraChange(gameSize?: Phaser.Structs.Size) {
		this.cameraService.onResizeOrCameraChange(gameSize)
	}

	public update(time: number, deltaMs: number): void {
		this.editContexts.update(deltaMs)
	}

	public savePrefab() {
		return this.persistence.savePrefab()
	}

	public onShutdown(): void {
		this.logger.debug(`${this.scene.key} shutdown - start`)

		super.onShutdown()

		this.contextDimming?.destroy()

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
