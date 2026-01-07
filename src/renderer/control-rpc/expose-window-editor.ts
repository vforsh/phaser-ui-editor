import type { ControlInput, ControlMethod, ControlOutput } from '@tekton/control-rpc-contract'

import type { AppCommandsEmitter } from '../AppCommands'

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
	const editor = {
		getCanvasMetrics: (params) => handlers.getCanvasMetrics(params ?? {}),
		addObjectComponent: (params) => handlers.addObjectComponent(params),
		openProject: (params) => handlers.openProject(params),
		openModal: (params) => handlers.openModal(params),
		closeModal: (params) => handlers.closeModal(params),
		closeAllModals: (params) => handlers.closeAllModals(params ?? {}),
		listModals: (params) => handlers.listModals(params ?? {}),
		getProjectInfo: (params) => handlers.getProjectInfo(params ?? {}),
		openPrefab: (params) => handlers.openPrefab(params),
		listHierarchy: (params) => handlers.listHierarchy(params ?? {}),
		listAssets: (params) => handlers.listAssets(params ?? {}),
		selectObject: (params) => handlers.selectObject(params),
		selectAssets: (params) => handlers.selectAssets(params),
		getSelectedAssets: (params) => handlers.getSelectedAssets(params ?? {}),
		switchToContext: (params) => handlers.switchToContext(params),
		deleteObjects: (params) => handlers.deleteObjects(params),
		createObject: (params) => handlers.createObject(params),
		createObjectFromAsset: (params) => handlers.createObjectFromAsset(params),
		duplicateObject: (params) => handlers.duplicateObject(params),
		moveObjectInHierarchy: (params) => handlers.moveObjectInHierarchy(params),
		renameObject: (params) => handlers.renameObject(params),
		patchObject: (params) => handlers.patchObject(params),
		patchObjectComponent: (params) => handlers.patchObjectComponent(params),
		removeObjectComponent: (params) => handlers.removeObjectComponent(params),
		getObjectMeta: (params) => handlers.getObjectMeta(params),
		getAssetInfo: (params) => handlers.getAssetInfo(params),
		getObject: (params) => handlers.getObject(params),
		getPrefabContent: (params) => handlers.getPrefabContent(params ?? {}),
		getPrefabDocument: (params) => handlers.getPrefabDocument(params ?? {}),
		getCanvasState: (params) => handlers.getCanvasState(params ?? {}),
		getControlMeta: (params) => handlers.getControlMeta(params ?? {}),
		listEditors: (params) => handlers.listEditors(params ?? {}),
		setCamera: (params) => handlers.setCamera(params ?? {}),
		waitForCanvasIdle: (params) => handlers.waitForCanvasIdle(params ?? {}),
		takeAppScreenshot: (params) => handlers.takeAppScreenshot(params ?? {}),
		takeAppPartScreenshot: (params) => handlers.takeAppPartScreenshot(params),
		takeCanvasScreenshot: (params) => handlers.takeCanvasScreenshot(params ?? {}),
		savePrefab: (params) => handlers.savePrefab(params ?? {}),
		createPrefabInstance: (params) => handlers.createPrefabInstance(params),
		createPrefabAsset: (params) => handlers.createPrefabAsset(params),
	} as WindowEditorApi

	window.editor = editor
}
