import type { ControlApi } from '@tekton/control-rpc-contract'

import type { AppCommandsEmitter } from '../../AppCommands'
import type { EditorControlContext } from './types'

import { addObjectComponent } from './handlers/addObjectComponent'
import { closeAllModals } from './handlers/closeAllModals'
import { closeModal } from './handlers/closeModal'
import { createGraphicsAt } from './handlers/createGraphicsAt'
import { createGraphicsObject } from './handlers/createGraphicsObject'
import { createObject } from './handlers/createObject'
import { createObjectFromAsset } from './handlers/createObjectFromAsset'
import { createPrefabAsset } from './handlers/createPrefabAsset'
import { createPrefabInstance } from './handlers/createPrefabInstance'
import { deleteObjects } from './handlers/deleteObjects'
import { discardUnsavedPrefab } from './handlers/discardUnsavedPrefab'
import { duplicateObject } from './handlers/duplicateObject'
import { fetchRendererLog } from './handlers/fetchRendererLog'
import { focusOnObject } from './handlers/focusOnObject'
import { getAssetInfo } from './handlers/getAssetInfo'
import { getCanvasMetrics } from './handlers/getCanvasMetrics'
import { getCanvasState } from './handlers/getCanvasState'
import { getControlMeta } from './handlers/getControlMeta'
import { getObject } from './handlers/getObject'
import { getObjectMeta } from './handlers/getObjectMeta'
import { getPrefabContent } from './handlers/getPrefabContent'
import { getPrefabDocument } from './handlers/getPrefabDocument'
import { getProjectInfo } from './handlers/getProjectInfo'
import { getSelectedAssets } from './handlers/getSelectedAssets'
import { listAssetsOfType } from './handlers/listAssetsOfType'
import { listAssetsTree } from './handlers/listAssetsTree'
import { listHierarchy } from './handlers/listHierarchy'
import { listModals } from './handlers/listModals'
import { listRendererLogs } from './handlers/listRendererLogs'
import { moveObjectInHierarchy } from './handlers/moveObjectInHierarchy'
import { openModal } from './handlers/openModal'
import { openPrefab } from './handlers/openPrefab'
import { openProject } from './handlers/openProject'
import { patchObject } from './handlers/patchObject'
import { patchObjectComponent } from './handlers/patchObjectComponent'
import { ping } from './handlers/ping'
import { removeObjectComponent } from './handlers/removeObjectComponent'
import { renameObject } from './handlers/renameObject'
import { savePrefab } from './handlers/savePrefab'
import { selectAssets } from './handlers/selectAssets'
import { selectObject } from './handlers/selectObject'
import { setCamera } from './handlers/setCamera'
import { switchToContext } from './handlers/switchToContext'
import { takeAppPartScreenshot } from './handlers/takeAppPartScreenshot'
import { takeAppScreenshot } from './handlers/takeAppScreenshot'
import { takeCanvasScreenshot } from './handlers/takeCanvasScreenshot'
/**
 * Thin RPC-facing service that translates external control requests into internal editor commands.
 */
export class EditorControlService {
	public readonly handlers: ControlApi
	private readonly ctx: EditorControlContext

	/**
	 * @param appCommands - Internal command bus used to trigger editor actions.
	 */
	constructor(appCommands: AppCommandsEmitter) {
		this.ctx = { appCommands }

		// CRITICAL: Handlers MUST have the same names as commands defined in ControlApi.ts.
		// If a command is renamed in the contract, the handler name here and in its module must be renamed too.
		const handlers = {
			addObjectComponent: addObjectComponent(this.ctx),
			openProject: openProject(this.ctx),
			openModal: openModal(this.ctx),
			closeModal: closeModal(this.ctx),
			closeAllModals: closeAllModals(this.ctx),
			listModals: listModals(this.ctx),
			selectAssets: selectAssets(this.ctx),
			getProjectInfo: getProjectInfo(this.ctx),
			openPrefab: openPrefab(this.ctx),
			listHierarchy: listHierarchy(this.ctx),
			listAssetsTree: listAssetsTree(this.ctx),
			listAssetsOfType: listAssetsOfType(this.ctx),
			selectObject: selectObject(this.ctx),
			switchToContext: switchToContext(this.ctx),
			deleteObjects: deleteObjects(this.ctx),
			discardUnsavedPrefab: discardUnsavedPrefab(this.ctx),
			createObject: createObject(this.ctx),
			createObjectFromAsset: createObjectFromAsset(this.ctx),
			createGraphicsAt: createGraphicsAt(this.ctx),
			createGraphicsObject: createGraphicsObject(this.ctx),
			duplicateObject: duplicateObject(this.ctx),
			focusOnObject: focusOnObject(this.ctx),
			moveObjectInHierarchy: moveObjectInHierarchy(this.ctx),
			renameObject: renameObject(this.ctx),
			patchObject: patchObject(this.ctx),
			patchObjectComponent: patchObjectComponent(this.ctx),
			removeObjectComponent: removeObjectComponent(this.ctx),
			getObjectMeta: getObjectMeta(this.ctx),
			getAssetInfo: getAssetInfo(this.ctx),
			getSelectedAssets: getSelectedAssets(this.ctx),
			getObject: getObject(this.ctx),
			getPrefabContent: getPrefabContent(this.ctx),
			getPrefabDocument: getPrefabDocument(this.ctx),
			getCanvasState: getCanvasState(this.ctx),
			getCanvasMetrics: getCanvasMetrics(this.ctx),
			getControlMeta: getControlMeta(this.ctx),
			ping: ping(this.ctx),
			setCamera: setCamera(this.ctx),
			takeAppScreenshot: takeAppScreenshot(this.ctx),
			takeAppPartScreenshot: takeAppPartScreenshot(this.ctx),
			takeCanvasScreenshot: takeCanvasScreenshot(this.ctx),
			savePrefab: savePrefab(this.ctx),
			createPrefabInstance: createPrefabInstance(this.ctx),
			createPrefabAsset: createPrefabAsset(this.ctx),
			listRendererLogs: listRendererLogs(this.ctx),
			fetchRendererLog: fetchRendererLog(this.ctx),
		} satisfies ControlApi

		this.handlers = handlers
	}
}
