import type { AppCommandsEmitter } from '../AppCommands'
import { EditorControlService } from './EditorControlService'
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

	const editor: WindowEditorApi = {
		openProject: (params) => service.openProject(params),
		getProjectInfo: () => service.getProjectInfo(),
		openPrefab: (params) => service.openPrefab(params),
		listHierarchy: () => service.listHierarchy(),
		listAssets: (params) => service.listAssets(params ?? {}),
		selectObject: (params) => service.selectObject(params),
		switchToContext: (params) => service.switchToContext(params),
		deleteObjects: (params) => service.deleteObjects(params),
		getAssetInfo: (params) => service.getAssetInfo(params),
		listEditors: () => service.listEditors(),
	}

	window.editor = editor
}
