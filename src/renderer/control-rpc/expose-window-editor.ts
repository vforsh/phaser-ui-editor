import type { AppCommandsEmitter } from '../AppCommands'
import type { ControlInput, ControlMethod, ControlOutput } from './api/ControlApi'

import { EditorControlService } from './service/EditorControlService'

/**
 * Inferred API type for the `window.editor` object.
 *
 * This type maps the methods from the contract to methods exposed on `window.editor`.
 */
export type WindowEditorApi = {
	[M in ControlMethod]: {} extends ControlInput<M>
		? (params?: ControlInput<M>) => Promise<ControlOutput<M>>
		: (params: ControlInput<M>) => Promise<ControlOutput<M>>
}

export function exposeWindowEditor(appCommands: AppCommandsEmitter): void {
	const service = new EditorControlService(appCommands)
	const handlers = service.handlers

	// NEVER EVER use `params: any`
	const editor: WindowEditorApi = {
		getCanvasMetrics: (params) => handlers.getCanvasMetrics(params ?? {}),
		openProject: (params) => handlers.openProject(params),
		getProjectInfo: (params) => handlers.getProjectInfo(params ?? {}),
		openPrefab: (params) => handlers.openPrefab(params),
		listHierarchy: (params) => handlers.listHierarchy(params ?? {}),
		listAssets: (params) => handlers.listAssets(params ?? {}),
		selectObject: (params) => handlers.selectObject(params),
		selectAssets: (params) => handlers.selectAssets(params),
		getSelectedAssets: (params) => handlers.getSelectedAssets(params ?? {}),
		switchToContext: (params) => handlers.switchToContext(params),
		deleteObjects: (params) => handlers.deleteObjects(params),
		getAssetInfo: (params) => handlers.getAssetInfo(params),
		getObject: (params) => handlers.getObject(params),
		getPrefabContent: (params) => handlers.getPrefabContent(params ?? {}),
		getCanvasState: (params) => handlers.getCanvasState(params ?? {}),
		listEditors: (params) => handlers.listEditors(params ?? {}),
		setCamera: (params) => handlers.setCamera(params ?? {}),
		takeCanvasScreenshot: (params) => handlers.takeCanvasScreenshot(params ?? {}),
	}

	window.editor = editor
}
