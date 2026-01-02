import type { AppCommandsEmitter } from '../AppCommands'
import { EditorControlService } from './EditorControlService'

export function exposeWindowEditor(appCommands: AppCommandsEmitter): void {
	if (!import.meta.env.DEV) {
		return
	}

	const service = new EditorControlService(appCommands)

	window.editor = {
		openProject: (params) => service.openProject(params),
		openPrefab: (params) => service.openPrefab(params),
		listHierarchy: () => service.listHierarchy(),
		selectObject: (params) => service.selectObject(params),
		switchToContext: (params) => service.switchToContext(params),
		deleteObjects: (params) => service.deleteObjects(params),
	}
}
