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
	description: string
	input: I
	output: O
}

export { projectConfigSchema, type ProjectConfig } from './commands/getProjectInfo'
export { assetNodeSchema, assetTypeSchema, type AssetNode, type AssetType } from './commands/listAssets'
export { hierarchyNodeSchema, type HierarchyNode } from './commands/listHierarchy'
export { successSchema } from './shared-schemas'

import { addObjectComponentCommand } from './commands/addObjectComponent'
import { createObjectCommand, createObjectFromAssetCommand } from './commands/createObject'
import { createPrefabAssetCommand } from './commands/createPrefabAsset'
import { createPrefabInstanceCommand } from './commands/createPrefabInstance'
import { deleteObjectsCommand } from './commands/deleteObjects'
import { duplicateObjectCommand } from './commands/duplicateObject'
import { getAssetInfoCommand } from './commands/getAssetInfo'
import { getCanvasMetricsCommand } from './commands/getCanvasMetrics'
import { getCanvasStateCommand } from './commands/getCanvasState'
import { getObjectCommand } from './commands/getObject'
import { getObjectMetaCommand } from './commands/getObjectMeta'
import { getPrefabContentCommand } from './commands/getPrefabContent'
import { getPrefabDocumentCommand } from './commands/getPrefabDocument'
import { getProjectInfoCommand } from './commands/getProjectInfo'
import { getSelectedAssetsCommand } from './commands/getSelectedAssets'
import { listAssetsCommand } from './commands/listAssets'
import { listEditorsCommand } from './commands/listEditors'
import { listHierarchyCommand } from './commands/listHierarchy'
import { moveObjectInHierarchyCommand } from './commands/moveObjectInHierarchy'
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
import { takeAppScreenshotCommand } from './commands/takeAppScreenshot'
import { takeCanvasScreenshotCommand } from './commands/takeCanvasScreenshot'
import { waitForCanvasIdleCommand } from './commands/waitForCanvasIdle'

export const controlContract = {
	addObjectComponent: addObjectComponentCommand,
	openProject: openProjectCommand,
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
	listEditors: listEditorsCommand,
	setCamera: setCameraCommand,
	waitForCanvasIdle: waitForCanvasIdleCommand,
	takeAppScreenshot: takeAppScreenshotCommand,
	takeCanvasScreenshot: takeCanvasScreenshotCommand,
	savePrefab: savePrefabCommand,
	createPrefabInstance: createPrefabInstanceCommand,
	createPrefabAsset: createPrefabAssetCommand,
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
