import { z } from 'zod'

export const COMMAND_GROUPS = {
	assets: 'assets',
	objects: 'objects',
	hierarchy: 'hierarchy',
	misc: 'misc',
	debug: 'debug',
} as const

export type CommandGroup = keyof typeof COMMAND_GROUPS

/**
 * Defines a single control RPC command with its metadata and Zod schemas.
 *
 * Use this with the `satisfies` operator to ensure the command matches the required structure
 * while preserving the specific Zod types for better inference.
 */
export type CommandDefinition<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> = {
	group: CommandGroup
	kind: 'read' | 'write'
	description: string
	input: I
	output: O
}

export { controlMetaSchema, type ControlMeta, type ControlMetaMethod } from './commands/getControlMeta.js'
export { projectConfigSchema, type ProjectConfig } from './commands/getProjectInfo.js'
export { assetNodeSchema, assetTypeSchema, type AssetNode, type AssetType } from './commands/listAssetsTree.js'
export { hierarchyNodeSchema, type HierarchyNode } from './commands/listHierarchy.js'
export { successSchema } from './shared-schemas.js'

import { addObjectComponentCommand } from './commands/addObjectComponent.js'
import { closeAllModalsCommand } from './commands/closeAllModals.js'
import { closeModalCommand } from './commands/closeModal.js'
import { createGraphicsAtCommand } from './commands/createGraphicsAt.js'
import { createGraphicsObjectCommand } from './commands/createGraphicsObject.js'
import { createObjectCommand, createObjectFromAssetCommand } from './commands/createObject.js'
import { createPrefabAssetCommand } from './commands/createPrefabAsset.js'
import { createPrefabInstanceCommand } from './commands/createPrefabInstance.js'
import { deleteObjectsCommand } from './commands/deleteObjects.js'
import { discardUnsavedPrefabCommand } from './commands/discardUnsavedPrefab.js'
import { duplicateObjectCommand } from './commands/duplicateObject.js'
import { fetchRendererLogCommand } from './commands/fetchRendererLog.js'
import { focusOnObjectCommand } from './commands/focusOnObject.js'
import { getAssetInfoCommand } from './commands/getAssetInfo.js'
import { getCanvasMetricsCommand } from './commands/getCanvasMetrics.js'
import { getCanvasStateCommand } from './commands/getCanvasState.js'
import { getControlMetaCommand } from './commands/getControlMeta.js'
import { getObjectCommand } from './commands/getObject.js'
import { getObjectMetaCommand } from './commands/getObjectMeta.js'
import { getPrefabContentCommand } from './commands/getPrefabContent.js'
import { getPrefabDocumentCommand } from './commands/getPrefabDocument.js'
import { getProjectInfoCommand } from './commands/getProjectInfo.js'
import { getSelectedAssetsCommand } from './commands/getSelectedAssets.js'
import { listAssetsOfTypeCommand } from './commands/listAssetsOfType.js'
import { listAssetsTreeCommand } from './commands/listAssetsTree.js'
import { listHierarchyCommand } from './commands/listHierarchy.js'
import { listModalsCommand } from './commands/listModals.js'
import { listRendererLogsCommand } from './commands/listRendererLogs.js'
import { moveObjectInHierarchyCommand } from './commands/moveObjectInHierarchy.js'
import { openModalCommand } from './commands/openModal.js'
import { openPrefabCommand } from './commands/openPrefab.js'
import { openProjectCommand } from './commands/openProject.js'
import { patchObjectCommand } from './commands/patchObject.js'
import { patchObjectComponentCommand } from './commands/patchObjectComponent.js'
import { pingCommand } from './commands/ping.js'
import { removeObjectComponentCommand } from './commands/removeObjectComponent.js'
import { renameObjectCommand } from './commands/renameObject.js'
import { savePrefabCommand } from './commands/savePrefab.js'
import { selectAssetsCommand } from './commands/selectAssets.js'
import { selectObjectCommand } from './commands/selectObject.js'
import { setCameraCommand } from './commands/setCamera.js'
import { switchToContextCommand } from './commands/switchToContext.js'
import { takeAppPartScreenshotCommand } from './commands/takeAppPartScreenshot.js'
import { takeAppScreenshotCommand } from './commands/takeAppScreenshot.js'
import { takeCanvasScreenshotCommand } from './commands/takeCanvasScreenshot.js'
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
	listAssetsTree: listAssetsTreeCommand,
	listAssetsOfType: listAssetsOfTypeCommand,
	selectObject: selectObjectCommand,
	switchToContext: switchToContextCommand,
	deleteObjects: deleteObjectsCommand,
	discardUnsavedPrefab: discardUnsavedPrefabCommand,
	createObject: createObjectCommand,
	createObjectFromAsset: createObjectFromAssetCommand,
	createGraphicsAt: createGraphicsAtCommand,
	createGraphicsObject: createGraphicsObjectCommand,
	duplicateObject: duplicateObjectCommand,
	focusOnObject: focusOnObjectCommand,
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
	ping: pingCommand,
	setCamera: setCameraCommand,
	takeAppScreenshot: takeAppScreenshotCommand,
	takeAppPartScreenshot: takeAppPartScreenshotCommand,
	takeCanvasScreenshot: takeCanvasScreenshotCommand,
	savePrefab: savePrefabCommand,
	createPrefabInstance: createPrefabInstanceCommand,
	createPrefabAsset: createPrefabAssetCommand,
	listRendererLogs: listRendererLogsCommand,
	fetchRendererLog: fetchRendererLogCommand,
} as const

/**
 * Full RPC contract map describing each control method's Zod `input` and `output` schemas.
 *
 * This is the source of truth used to derive method names and strongly-typed payloads.
 */
export type ControlContract = typeof controlContract

/**
 * String literal union of all supported control RPC method names.
 */
export type ControlMethod = keyof ControlContract

/**
 * Inferred (input) TypeScript type for a given control method, derived from its Zod `input` schema.
 */
export type ControlInput<M extends ControlMethod> = z.input<ControlContract[M]['input']>

/**
 * Inferred (output) TypeScript type for a given control method, derived from its Zod `output` schema.
 */
export type ControlOutput<M extends ControlMethod> = z.output<ControlContract[M]['output']>

/**
 * Strongly-typed representation of the entire control RPC API.
 *
 * This type maps each method name from the `controlContract` to its corresponding
 * async function signature, ensuring that both inputs and outputs match the Zod schemas.
 */
export type ControlApi = {
	[M in ControlMethod]: (input: ControlInput<M>) => Promise<ControlOutput<M>>
}

const controlMethods = new Set(Object.keys(controlContract))

export function isControlMethod(value: unknown): value is ControlMethod {
	return typeof value === 'string' && controlMethods.has(value)
}
