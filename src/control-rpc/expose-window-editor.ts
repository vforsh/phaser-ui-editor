import type { AppCommandsEmitter } from '../AppCommands'
import { EditorControlService } from './service/EditorControlService'
import type { ControlInput, ControlMethod, ControlOutput } from './api/ControlApi'

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

	const editor: WindowEditorApi = {
		openProject: (params) => handlers.openProject(params),
		getProjectInfo: (params) => handlers.getProjectInfo(params ?? {}),
		openPrefab: (params) => handlers.openPrefab(params),
		listHierarchy: (params) => handlers.listHierarchy(params ?? {}),
		listAssets: (params) => handlers.listAssets(params ?? {}),
		selectObject: (params) => handlers.selectObject(params),
		switchToContext: (params) => handlers.switchToContext(params),
		deleteObjects: (params) => handlers.deleteObjects(params),
		getAssetInfo: (params) => handlers.getAssetInfo(params),
		listEditors: (params) => handlers.listEditors(params ?? {}),
		takeCanvasScreenshot: (params) => handlers.takeCanvasScreenshot(params ?? {}),
	}

	window.editor = editor
}
