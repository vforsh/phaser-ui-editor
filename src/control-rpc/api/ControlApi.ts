import { z } from 'zod'

export const COMMAND_GROUPS = {
	assets: 'assets',
	objects: 'objects',
	hierarchy: 'hierarchy',
	misc: 'misc',
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

export { projectConfigSchema, type ProjectConfig } from './commands/get-project-info'
export { assetNodeSchema, assetTypeSchema, type AssetNode, type AssetType } from './commands/list-assets'
export { hierarchyNodeSchema, type HierarchyNode } from './commands/list-hierarchy'
export { successSchema } from './shared-schemas'

import { deleteObjectsCommand } from './commands/delete-objects'
import { getAssetInfoCommand } from './commands/get-asset-info'
import { getProjectInfoCommand } from './commands/get-project-info'
import { listAssetsCommand } from './commands/list-assets'
import { listEditorsCommand } from './commands/list-editors'
import { listHierarchyCommand } from './commands/list-hierarchy'
import { openPrefabCommand } from './commands/open-prefab'
import { openProjectCommand } from './commands/open-project'
import { selectObjectCommand } from './commands/select-object'
import { switchToContextCommand } from './commands/switch-to-context'

export const controlContract = {
	'open-project': openProjectCommand,
	'get-project-info': getProjectInfoCommand,
	'open-prefab': openPrefabCommand,
	'list-hierarchy': listHierarchyCommand,
	'list-assets': listAssetsCommand,
	'select-object': selectObjectCommand,
	'switch-to-context': switchToContextCommand,
	'delete-objects': deleteObjectsCommand,
	'get-asset-info': getAssetInfoCommand,
	'list-editors': listEditorsCommand,
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
