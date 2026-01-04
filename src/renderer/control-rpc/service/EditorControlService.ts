import type { AppCommandsEmitter } from '../../AppCommands'
import type { ControlApi } from '../api/ControlApi'
import type { EditorControlContext } from './types'

import { createObject } from './handlers/createObject'
import { createObjectFromAsset } from './handlers/createObjectFromAsset'
import { createPrefabInstance } from './handlers/createPrefabInstance'
import { deleteObjects } from './handlers/deleteObjects'
import { duplicateObject } from './handlers/duplicateObject'
import { getAssetInfo } from './handlers/getAssetInfo'
import { getCanvasMetrics } from './handlers/getCanvasMetrics'
import { getCanvasState } from './handlers/getCanvasState'
import { getObject } from './handlers/getObject'
import { getPrefabContent } from './handlers/getPrefabContent'
import { getPrefabDocument } from './handlers/getPrefabDocument'
import { getProjectInfo } from './handlers/getProjectInfo'
import { getSelectedAssets } from './handlers/getSelectedAssets'
import { listAssets } from './handlers/listAssets'
import { listEditors } from './handlers/listEditors'
import { listHierarchy } from './handlers/listHierarchy'
import { moveObjectInHierarchy } from './handlers/moveObjectInHierarchy'
import { openPrefab } from './handlers/openPrefab'
import { openProject } from './handlers/openProject'
import { patchObject } from './handlers/patchObject'
import { patchObjectComponent } from './handlers/patchObjectComponent'
import { renameObject } from './handlers/renameObject'
import { resolveNode } from './handlers/resolveNode'
import { savePrefab } from './handlers/savePrefab'
import { selectAssets } from './handlers/selectAssets'
import { selectNode } from './handlers/selectNode'
import { selectObject } from './handlers/selectObject'
import { setCamera } from './handlers/setCamera'
import { switchToContext } from './handlers/switchToContext'
import { takeCanvasScreenshot } from './handlers/takeCanvasScreenshot'
import { waitForCanvasIdle } from './handlers/waitForCanvasIdle'

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

		const handlers = {
			openProject: openProject(this.ctx),
			selectAssets: selectAssets(this.ctx),
			getProjectInfo: getProjectInfo(this.ctx),
			openPrefab: openPrefab(this.ctx),
			listHierarchy: listHierarchy(this.ctx),
			listAssets: listAssets(this.ctx),
			selectObject: selectObject(this.ctx),
			selectNode: selectNode(this.ctx),
			switchToContext: switchToContext(this.ctx),
			deleteObjects: deleteObjects(this.ctx),
			createObject: createObject(this.ctx),
			createObjectFromAsset: createObjectFromAsset(this.ctx),
			duplicateObject: duplicateObject(this.ctx),
			moveObjectInHierarchy: moveObjectInHierarchy(this.ctx),
			renameObject: renameObject(this.ctx),
			setObjectPatch: patchObject(this.ctx),
			setComponentPatch: patchObjectComponent(this.ctx),
			resolveNode: resolveNode(this.ctx),
			getAssetInfo: getAssetInfo(this.ctx),
			getSelectedAssets: getSelectedAssets(this.ctx),
			getObject: getObject(this.ctx),
			getPrefabContent: getPrefabContent(this.ctx),
			getPrefabDocument: getPrefabDocument(this.ctx),
			getCanvasState: getCanvasState(this.ctx),
			getCanvasMetrics: getCanvasMetrics(this.ctx),
			listEditors: listEditors(this.ctx),
			setCamera: setCamera(this.ctx),
			waitForCanvasIdle: waitForCanvasIdle(this.ctx),
			takeCanvasScreenshot: takeCanvasScreenshot(this.ctx),
			savePrefab: savePrefab(this.ctx),
			createPrefabInstance: createPrefabInstance(this.ctx),
		} satisfies ControlApi

		this.handlers = handlers
	}
}
