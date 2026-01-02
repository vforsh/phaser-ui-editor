import { z } from 'zod'

export type HierarchyNode = {
	id: string
	name: string
	type: string
	children?: HierarchyNode[]
}

const hierarchyNodeSchema: z.ZodType<HierarchyNode> = z.lazy(() =>
	z.object({
		id: z.string(),
		name: z.string(),
		type: z.string(),
		children: z.array(hierarchyNodeSchema).optional(),
	})
)

const successSchema = z.object({ success: z.literal(true) })

export const controlContract = {
	'open-project': {
		input: z.object({ path: z.string().min(1, 'path is required') }),
		output: successSchema,
	},
	'open-prefab': {
		input: z.object({ assetId: z.string().optional(), path: z.string().optional() }),
		output: successSchema,
	},
	'list-hierarchy': {
		input: z.object({}),
		output: hierarchyNodeSchema,
	},
	'select-object': {
		input: z.object({ id: z.string().optional(), path: z.string().optional() }),
		output: successSchema,
	},
	'switch-to-context': {
		input: z.object({ id: z.string().optional(), path: z.string().optional() }),
		output: successSchema,
	},
	'delete-objects': {
		input: z.object({ ids: z.array(z.string()) }),
		output: successSchema,
	},
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

export type ControlApi = {
	[M in ControlMethod]: (input: ControlInput<M>) => Promise<ControlOutput<M>>
}

const controlMethods = new Set(Object.keys(controlContract))

export function isControlMethod(value: unknown): value is ControlMethod {
	return typeof value === 'string' && controlMethods.has(value)
}
