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

export const assetTypeSchema = z.enum([
	'folder',
	'file',
	'json',
	'xml',
	'image',
	'prefab',
	'web-font',
	'bitmap-font',
	'spritesheet',
	'spritesheet-folder',
	'spritesheet-frame',
])

export type AssetType = z.infer<typeof assetTypeSchema>

export type AssetNode = {
	type: AssetType
	id: string
	name: string
	/**
	 * Project-relative path (relative to `projectDir`) for filesystem-backed assets.
	 *
	 * For spritesheet frames/folders this is a virtual path used for hierarchy display.
	 */
	path: string
	// folder
	children?: AssetNode[]
	// spritesheet
	image?: {
		type: 'image'
		id: string
		name: string
		path: string
		size: { w: number; h: number }
		scale9Borders?: { x: number; y: number; w: number; h: number }
	}
	json?: { type: 'json'; id: string; name: string; path: string }
	frames?: (AssetNode & ({ type: 'spritesheet-frame' } | { type: 'spritesheet-folder' }))[]
	project?: string
	// web-font
	fontFamily?: string
	// bitmap-font
	imageExtra?: { atlas: string; texture: string; texturePacker: string }
	data?: { type: 'json' | 'xml'; id: string; name: string; path: string }
	// spritesheet-folder / spritesheet-frame
	imagePath?: string
	jsonPath?: string
	pathInHierarchy?: string
	size?: { w: number; h: number }
	anchor?: { x: number; y: number }
	scale9Borders?: { x: number; y: number; w: number; h: number }
	parentId?: string
}

const assetNodeSchema: z.ZodType<AssetNode> = z.lazy(() => {
	const base = z.object({
		id: z.string(),
		name: z.string(),
		path: z.string().min(1),
	})

	const imageSchema = base.extend({
		type: z.literal('image'),
		size: z.object({ w: z.number(), h: z.number() }),
		scale9Borders: z
			.object({
				x: z.number(),
				y: z.number(),
				w: z.number(),
				h: z.number(),
			})
			.optional(),
	})

	const jsonSchema = base.extend({
		type: z.literal('json'),
	})

	const xmlSchema = base.extend({
		type: z.literal('xml'),
	})

	const folderSchema = base.extend({
		type: z.literal('folder'),
		children: z.array(assetNodeSchema),
	})

	const fileSchema = base.extend({
		type: z.literal('file'),
	})

	const prefabSchema = base.extend({
		type: z.literal('prefab'),
	})

	const webFontSchema = base.extend({
		type: z.literal('web-font'),
		fontFamily: z.string().min(1),
	})

	const bitmapFontSchema = base.extend({
		type: z.literal('bitmap-font'),
		image: imageSchema,
		data: z.union([jsonSchema, xmlSchema]),
		imageExtra: z
			.object({
				atlas: z.string().min(1),
				texture: z.string().min(1),
				texturePacker: z.string().min(1),
			})
			.optional(),
	})

	const spritesheetFrameSchema = base.extend({
		type: z.literal('spritesheet-frame'),
		imagePath: z.string().min(1),
		jsonPath: z.string().min(1),
		pathInHierarchy: z.string().min(1),
		size: z.object({ w: z.number(), h: z.number() }),
		anchor: z.object({ x: z.number(), y: z.number() }),
		scale9Borders: z
			.object({
				x: z.number(),
				y: z.number(),
				w: z.number(),
				h: z.number(),
			})
			.optional(),
		project: z.string().optional(),
		parentId: z.string().optional(),
	})

	const spritesheetFolderSchema = base.extend({
		type: z.literal('spritesheet-folder'),
		imagePath: z.string().min(1),
		jsonPath: z.string().min(1),
		children: z.array(spritesheetFrameSchema),
		project: z.string().optional(),
	})

	const spritesheetSchema = base.extend({
		type: z.literal('spritesheet'),
		image: imageSchema,
		json: jsonSchema,
		frames: z.array(z.union([spritesheetFrameSchema, spritesheetFolderSchema])),
		project: z.string().optional(),
	})

	return z.discriminatedUnion('type', [
		folderSchema,
		fileSchema,
		jsonSchema,
		xmlSchema,
		imageSchema,
		prefabSchema,
		webFontSchema,
		bitmapFontSchema,
		spritesheetSchema,
		spritesheetFolderSchema,
		spritesheetFrameSchema,
	])
})

const successSchema = z.object({ success: z.literal(true) })
const projectConfigSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1).optional(),
	l10n: z.string().endsWith('.json').optional(),
	texturePacker: z.object({
		path: z.string().min(1),
		mapping: z.record(z.string()).optional(),
	}),
	assetsDir: z.string().min(1),
	assetsIgnore: z.array(z.string()),
	size: z.object({
		width: z.number().int().positive(),
		height: z.number().int().positive(),
	}),
})

export type ProjectConfig = z.infer<typeof projectConfigSchema>

export const controlContract = {
	'open-project': {
		input: z.object({ path: z.string().min(1, 'path is required') }),
		output: successSchema,
	},
	'get-project-info': {
		input: z.object({}),
		output: projectConfigSchema.extend({
			path: z.string().min(1),
		}),
	},
	'open-prefab': {
		input: z.union([
			z.object({ assetId: z.string().min(1) }).strict(),
			z.object({ path: z.string().min(1) }).strict(),
		]),
		output: successSchema,
	},
	'list-hierarchy': {
		input: z.object({}),
		output: hierarchyNodeSchema,
	},
	'list-assets': {
		input: z
			.object({
				types: z.array(assetTypeSchema).optional(),
			})
			.strict(),
		output: z
			.object({
				assets: z.array(assetNodeSchema),
			})
			.strict(),
	},
	'select-object': {
		input: z.union([
			z.object({ id: z.string().min(1) }).strict(),
			z.object({ path: z.string().min(1) }).strict(),
		]),
		output: successSchema,
	},
	'switch-to-context': {
		input: z.union([
			z.object({ id: z.string().min(1) }).strict(),
			z.object({ path: z.string().min(1) }).strict(),
		]),
		output: successSchema,
	},
	'delete-objects': {
		input: z.object({ ids: z.array(z.string()) }),
		output: successSchema,
	},
	'get-asset-info': {
		input: z.union([
			z.object({ id: z.string().min(1) }).strict(),
			z.object({ path: z.string().min(1) }).strict(),
		]),
		output: assetNodeSchema,
	},
	'list-editors': {
		input: z.object({}),
		output: z.object({
			editors: z.array(
				z.object({
					windowId: z.number(),
					projectPath: z.string().nullable(),
				})
			),
		}),
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
