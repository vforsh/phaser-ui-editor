export const COMMAND_GROUPS = {
	assets: 'assets',
	objects: 'objects',
	hierarchy: 'hierarchy',
	misc: 'misc',
	debug: 'debug',
}
export { controlMetaSchema } from './commands/getControlMeta'
export { projectConfigSchema } from './commands/getProjectInfo'
export { assetNodeSchema, assetTypeSchema } from './commands/listAssets'
export { hierarchyNodeSchema } from './commands/listHierarchy'
export { successSchema } from './shared-schemas'
import { addObjectComponentCommand } from './commands/addObjectComponent'
import { closeAllModalsCommand } from './commands/closeAllModals'
import { closeModalCommand } from './commands/closeModal'
import { createObjectCommand, createObjectFromAssetCommand } from './commands/createObject'
import { createPrefabAssetCommand } from './commands/createPrefabAsset'
import { createPrefabInstanceCommand } from './commands/createPrefabInstance'
import { deleteObjectsCommand } from './commands/deleteObjects'
import { duplicateObjectCommand } from './commands/duplicateObject'
import { getAssetInfoCommand } from './commands/getAssetInfo'
import { getCanvasMetricsCommand } from './commands/getCanvasMetrics'
import { getCanvasStateCommand } from './commands/getCanvasState'
import { getControlMetaCommand } from './commands/getControlMeta'
import { getObjectCommand } from './commands/getObject'
import { getObjectMetaCommand } from './commands/getObjectMeta'
import { getPrefabContentCommand } from './commands/getPrefabContent'
import { getPrefabDocumentCommand } from './commands/getPrefabDocument'
import { getProjectInfoCommand } from './commands/getProjectInfo'
import { getSelectedAssetsCommand } from './commands/getSelectedAssets'
import { listAssetsCommand } from './commands/listAssets'
import { listEditorsCommand } from './commands/listEditors'
import { listHierarchyCommand } from './commands/listHierarchy'
import { listModalsCommand } from './commands/listModals'
import { moveObjectInHierarchyCommand } from './commands/moveObjectInHierarchy'
import { openModalCommand } from './commands/openModal'
import { openPrefabCommand } from './commands/openPrefab'
import { openProjectCommand } from './commands/openProject'
import { patchObjectCommand } from './commands/patchObject'
import { patchObjectComponentCommand } from './commands/patchObjectComponent'
import { removeObjectComponentCommand } from './commands/removeObjectComponent'
import { renameObjectCommand } from './commands/renameObject'
import { savePrefabCommand } from './commands/savePrefab'
import { selectAssetsCommand } from './commands/selectAssets'
import { selectObjectCommand } from './commands/selectObject'
import { setCameraCommand } from './commands/setCamera'
import { switchToContextCommand } from './commands/switchToContext'
import { takeAppPartScreenshotCommand } from './commands/takeAppPartScreenshot'
import { takeAppScreenshotCommand } from './commands/takeAppScreenshot'
import { takeCanvasScreenshotCommand } from './commands/takeCanvasScreenshot'
import { waitForCanvasIdleCommand } from './commands/waitForCanvasIdle'
export const controlContract = {
	addObjectComponent: addObjectComponentCommand,
	openProject: openProjectCommand,
	openModal: openModalCommand,
	closeModal: closeModalCommand,
	closeAllModals: closeAllModalsCommand,
	listModals: listModalsCommand,
	selectAssets: selectAssetsCommand,
	getProjectInfo: getProjectInfoCommand,
	openPrefab: openPrefabCommand,
	listHierarchy: listHierarchyCommand,
	listAssets: listAssetsCommand,
	selectObject: selectObjectCommand,
	switchToContext: switchToContextCommand,
	deleteObjects: deleteObjectsCommand,
	createObject: createObjectCommand,
	createObjectFromAsset: createObjectFromAssetCommand,
	duplicateObject: duplicateObjectCommand,
	moveObjectInHierarchy: moveObjectInHierarchyCommand,
	renameObject: renameObjectCommand,
	patchObject: patchObjectCommand,
	patchObjectComponent: patchObjectComponentCommand,
	removeObjectComponent: removeObjectComponentCommand,
	getObjectMeta: getObjectMetaCommand,
	getAssetInfo: getAssetInfoCommand,
	getSelectedAssets: getSelectedAssetsCommand,
	getObject: getObjectCommand,
	getPrefabContent: getPrefabContentCommand,
	getPrefabDocument: getPrefabDocumentCommand,
	getCanvasState: getCanvasStateCommand,
	getCanvasMetrics: getCanvasMetricsCommand,
	getControlMeta: getControlMetaCommand,
	listEditors: listEditorsCommand,
	setCamera: setCameraCommand,
	waitForCanvasIdle: waitForCanvasIdleCommand,
	takeAppScreenshot: takeAppScreenshotCommand,
	takeAppPartScreenshot: takeAppPartScreenshotCommand,
	takeCanvasScreenshot: takeCanvasScreenshotCommand,
	savePrefab: savePrefabCommand,
	createPrefabInstance: createPrefabInstanceCommand,
	createPrefabAsset: createPrefabAssetCommand,
}
const controlMethods = new Set(Object.keys(controlContract))
export function isControlMethod(value) {
	return typeof value === 'string' && controlMethods.has(value)
}
//# sourceMappingURL=ControlApi.js.map
