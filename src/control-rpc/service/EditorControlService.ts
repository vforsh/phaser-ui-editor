import type { AppCommandsEmitter } from '../../AppCommands'
import type { ControlApi } from '../api/ControlApi'
import { deleteObjects } from './handlers/deleteObjects'
import { getCanvasState } from './handlers/getCanvasState'
import { getAssetInfo } from './handlers/getAssetInfo'
import { getObject } from './handlers/getObject'
import { getPrefabContent } from './handlers/getPrefabContent'
import { getProjectInfo } from './handlers/getProjectInfo'
import { listAssets } from './handlers/listAssets'
import { listEditors } from './handlers/listEditors'
import { listHierarchy } from './handlers/listHierarchy'
import { openPrefab } from './handlers/openPrefab'
import { openProject } from './handlers/openProject'
import { selectObject } from './handlers/selectObject'
import { setCamera } from './handlers/setCamera'
import { switchToContext } from './handlers/switchToContext'
import { takeCanvasScreenshot } from './handlers/takeCanvasScreenshot'
import type { EditorControlContext } from './types'

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
			getProjectInfo: getProjectInfo(this.ctx),
			openPrefab: openPrefab(this.ctx),
			listHierarchy: listHierarchy(this.ctx),
			listAssets: listAssets(this.ctx),
			selectObject: selectObject(this.ctx),
			switchToContext: switchToContext(this.ctx),
			deleteObjects: deleteObjects(this.ctx),
			getAssetInfo: getAssetInfo(this.ctx),
			getObject: getObject(this.ctx),
			getPrefabContent: getPrefabContent(this.ctx),
			getCanvasState: getCanvasState(this.ctx),
			listEditors: listEditors(this.ctx),
			setCamera: setCamera(this.ctx),
			takeCanvasScreenshot: takeCanvasScreenshot(this.ctx),
		} satisfies ControlApi

		this.handlers = handlers
	}
}
