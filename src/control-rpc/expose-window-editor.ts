import type { AppCommandsEmitter } from '../AppCommands'
import { EditorControlService } from './EditorControlService'
import type { ControlInput, ControlMethod, ControlOutput } from './contract'

/**
 * Utility to convert kebab-case strings to camelCase.
 */
type KebabToCamelCase<S extends string> = S extends `${infer T}-${infer U}`
	? `${T}${Capitalize<KebabToCamelCase<U>>}`
	: S

/**
 * Inferred API type for the `window.editor` object.
 *
 * This type maps kebab-case methods from the contract (e.g., 'open-project')
 * to camelCase methods (e.g., 'openProject') used in the renderer.
 */
export type WindowEditorApi = {
	[M in ControlMethod as KebabToCamelCase<M>]: {} extends ControlInput<M>
		? (params?: ControlInput<M>) => Promise<ControlOutput<M>>
		: (params: ControlInput<M>) => Promise<ControlOutput<M>>
}

export function exposeWindowEditor(appCommands: AppCommandsEmitter): void {
	if (!import.meta.env.DEV) {
		return
	}

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
