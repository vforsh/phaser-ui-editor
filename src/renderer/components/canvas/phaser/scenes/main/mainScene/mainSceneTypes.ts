import { Logger, ILogObj } from 'tslog'

import type { Aligner } from '../Aligner'
import type { PrefabDocumentService } from '../prefabs/PrefabDocumentService'
import type { MainSceneAssetLoader } from './MainSceneAssetLoader'
import type { MainSceneCamera } from './MainSceneCamera'
import type { MainSceneHistory } from './MainSceneHistory'
import type { MainScenePrefabPersistence } from './MainScenePrefabPersistence'
import type { MainSceneScreenshot } from './MainSceneScreenshot'
import type { MainSceneOps } from './MainSceneSelectionOps'

import { Project } from '../../../../../../project/Project'
import { AssetTreePrefabData } from '../../../../../../types/assets'
import { CanvasDocumentJson } from '../../../../../../types/prefabs/PrefabDocument'
import { PrefabFile } from '../../../../../../types/prefabs/PrefabFile'
import { CanvasClipboard } from '../CanvasClipboard'
import { EditContextsManager } from '../editContext/EditContextsManager'
import { EditContextFrame } from '../EditContextFrame'
import { Grid } from '../Grid'
import { LayoutSystem } from '../layout/LayoutSystem'
import { EditableComponentsFactory } from '../objects/components/base/EditableComponentsFactory'
import { EditableContainer } from '../objects/EditableContainer'
import { EditableObjectsFactory } from '../objects/EditableObjectsFactory'
import { Rulers } from '../Rulers'

export type MainSceneInitData = {
	project: Project
	prefabAsset: AssetTreePrefabData
	prefabFile: PrefabFile
}

export interface MainSceneDeps {
	/**
	 * Phaser scene instance this feature-set is installed into.
	 * Ownership: MainScene.
	 */
	scene: Phaser.Scene

	/** Immutable init payload used to boot MainScene for a given project/prefab. */
	sceneInitData: MainSceneInitData

	/**
	 * Logger scoped to the MainScene runtime.
	 * Use for consistent, structured logs from all subsystems.
	 */
	logger: Logger<ILogObj>

	/**
	 * Abort signal fired when the scene is shutting down.
	 * Subsystems should stop timers/listeners and cancel async work when aborted.
	 */
	shutdownSignal: AbortSignal

	/** Background grid rendering + grid-related helpers (snap/spacing). */
	grid: Grid

	/** Pixel rulers overlay used for layout/positioning feedback. */
	rulers: Rulers

	/** Edit-context registry + switching (e.g. prefab context vs root). */
	editContexts: EditContextsManager

	/** Visual frame/bounds that indicates the active edit context. */
	contextFrame: EditContextFrame

	/** Factory for creating editable Phaser objects (containers/images/text/etc). */
	objectsFactory: EditableObjectsFactory

	/** Factory for creating editable “components” attached to objects. */
	componentsFactory: EditableComponentsFactory

	/** Layout/constraints engine (e.g. grid layouts, alignment rules). */
	layoutSystem: LayoutSystem

	/** Clipboard integration for copy/cut/paste on canvas selection. */
	clipboard: CanvasClipboard

	/** Alignment helpers (distribute/align selection). */
	aligner: Aligner

	/** Loads assets needed by MainScene (textures/fonts/etc) and tracks readiness. */
	assetLoader: MainSceneAssetLoader

	/** Undo/redo history integration for canvas edits. */
	history: MainSceneHistory

	/** Camera orchestration: zoom/scroll and related UX utilities. */
	cameraService: MainSceneCamera

	/** Selection operations: pick, move, transform, multi-select behaviors. */
	ops: MainSceneOps

	/** Prefab persistence: saving/loading prefab files and syncing canvas state. */
	persistence: MainScenePrefabPersistence

	/** Screenshot/export utilities for the current canvas. */
	screenshot: MainSceneScreenshot

	/** Prefab document resolver/serializer + template cache. */
	prefabDocument: PrefabDocumentService

	/** Current editable root for the active edit context. */
	getRoot: () => EditableContainer

	/** Replace the current editable root (used by (re)load/reset flows). */
	setRoot: (root: EditableContainer) => void

	/**
	 * Top-most container that holds everything in the scene (including edit roots).
	 * Useful for coordinate transforms / global traversal.
	 */
	getSuperRoot: () => EditableContainer

	/** Notify MainScene to recompute overlays and derived state after resize/camera changes. */
	onResizeOrCameraChange: () => void

	/** Serialize the current editable root to a collapsed document JSON for persistence/history/snapshots. */
	rootToJson: () => CanvasDocumentJson

	/** Return sibling ids for an object id (used for ordering + layout operations). */
	getObjectSiblingsIds: (id: string) => string[]

	/** Fully restart/recreate MainScene runtime (used for hard resets). */
	restart: () => void
}
