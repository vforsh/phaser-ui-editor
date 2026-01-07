import { z } from 'zod'

const absPathSchema = z.string().min(1, 'path is required')

const globbyOptionsSchema = z
	.object({
		cwd: z.string(),
		dot: z.boolean(),
		gitignore: z.boolean(),
		ignore: z.array(z.string()),
		expandDirectories: z.boolean(),
		onlyFiles: z.boolean(),
		onlyDirectories: z.boolean(),
		markDirectories: z.boolean(),
		objectMode: z.boolean(),
		stats: z.boolean(),
	})
	.partial()
	.optional()

const openOptionsSchema = z
	.object({
		app: z.object({
			name: z.string(),
			arguments: z.array(z.string()).optional(),
		}),
		wait: z.boolean(),
		background: z.boolean(),
		newInstance: z.boolean(),
		allowNonzeroExitCode: z.boolean(),
	})
	.partial()
	.optional()

const binaryPayloadSchema = z.object({
	bytes: z.instanceof(Uint8Array),
	mime: z.string().optional(),
})

const statSchema = z.object({
	size: z.number(),
	isFile: z.boolean(),
	isDirectory: z.boolean(),
	isSymbolicLink: z.boolean(),
})

const writeJsonOptionsSchema = z
	.object({
		spaces: z.union([z.number(), z.literal('\t')]).optional(),
	})
	.optional()

const fileDialogFiltersSchema = z
	.array(
		z.object({
			name: z.string(),
			extensions: z.array(z.string()),
		}),
	)
	.optional()

const fileDialogOptionsSchema = z
	.object({
		title: z.string().optional(),
		defaultPath: z.string().optional(),
		filters: fileDialogFiltersSchema,
	})
	.optional()

export const webFontParsedSchema = z.object({
	base64: z.string(),
	type: z.string(),
	postscriptName: z.string(),
	fullName: z.string(),
	familyName: z.string(),
	subfamilyName: z.string(),
	version: z.string(),
	numGlyphs: z.number(),
	unitsPerEm: z.number(),
	bbox: z.unknown(),
	ascent: z.number(),
	descent: z.number(),
	lineGap: z.number(),
	capHeight: z.number().optional(),
	xHeight: z.number().optional(),
	italicAngle: z.number(),
	underlinePosition: z.number(),
	underlineThickness: z.number(),
	availableFeatures: z.unknown(),
	characterSet: z.array(z.number()),
})

export type WebFontParsed = z.output<typeof webFontParsedSchema>

export const mainApiContract = {
	globby: {
		input: z.object({ patterns: z.array(z.string()), options: globbyOptionsSchema }),
		output: z.array(z.string()),
	},
	exists: {
		input: z.object({ path: absPathSchema }),
		output: z.boolean(),
	},
	stat: {
		input: z.object({ path: absPathSchema }),
		output: statSchema,
	},
	open: {
		input: z.object({ path: absPathSchema, options: openOptionsSchema }),
		output: z.object({ success: z.literal(true) }),
	},
	remove: {
		input: z.object({ path: absPathSchema }),
		output: z.object({ success: z.literal(true) }),
	},
	createFolder: {
		input: z.object({ path: absPathSchema }),
		output: z.object({ success: z.literal(true) }),
	},
	createFile: {
		input: z.object({ path: absPathSchema }),
		output: z.object({ success: z.literal(true) }),
	},
	createTextFile: {
		input: z.object({ path: absPathSchema, content: z.string() }),
		output: z.object({ success: z.literal(true) }),
	},
	trash: {
		input: z.object({ path: absPathSchema }),
		output: z.object({ success: z.literal(true) }),
	},
	rename: {
		input: z.object({ oldPath: absPathSchema, newPath: absPathSchema }),
		output: z.object({ success: z.literal(true) }),
	},
	readImageSize: {
		input: z.object({ path: absPathSchema }),
		output: z.object({ width: z.number(), height: z.number() }),
	},
	readFile: {
		input: z.object({ path: absPathSchema }),
		output: binaryPayloadSchema,
	},
	readJson: {
		input: z.object({ path: absPathSchema }),
		output: z.unknown(),
	},
	readBmfontXml: {
		input: z.object({ path: absPathSchema }),
		output: z.unknown(),
	},
	readText: {
		input: z.object({ path: absPathSchema }),
		output: z.object({ content: z.string() }),
	},
	readSpritesheetFrame: {
		input: z.object({ spritesheetPath: absPathSchema, frameName: z.string().min(1) }),
		output: binaryPayloadSchema,
	},
	writeJson: {
		input: z.object({
			path: absPathSchema,
			content: z.unknown(),
			options: writeJsonOptionsSchema,
		}),
		output: z.object({ path: absPathSchema }),
	},
	duplicate: {
		input: z.object({ path: absPathSchema }),
		output: z.object({ path: absPathSchema }),
	},
	parseWebFont: {
		input: z.object({ path: absPathSchema }),
		output: webFontParsedSchema,
	},
	selectDirectory: {
		input: z
			.object({
				title: z.string().optional(),
				defaultPath: z.string().optional(),
			})
			.optional(),
		output: z.object({ canceled: z.boolean(), path: z.string().nullable() }),
	},
	selectFile: {
		input: fileDialogOptionsSchema,
		output: z.object({ canceled: z.boolean(), path: z.string().nullable() }),
	},
	saveFileDialog: {
		input: fileDialogOptionsSchema,
		output: z.object({ canceled: z.boolean(), path: z.string().nullable() }),
	},
	saveScreenshot: {
		input: z.object({
			targetDir: absPathSchema,
			fileName: z.string().min(1),
			bytes: z.instanceof(Uint8Array),
		}),
		output: z.object({ path: absPathSchema }),
	},
	takeAppScreenshot: {
		input: z.object({
			targetDir: absPathSchema,
			fileName: z.string().min(1),
			format: z.enum(['png', 'jpg', 'webp']).optional(),
		}),
		output: z.object({ path: absPathSchema }),
	},
	showItemInFolder: {
		input: z.object({ path: absPathSchema }),
		output: z.object({ success: z.literal(true) }),
	},
	showCanvasContextMenu: {
		input: z.object({
			x: z.number(),
			y: z.number(),
		}),
		output: z.object({
			action: z.enum(['rectangle', 'ellipse']).nullable(),
		}),
	},
} as const

export type MainApiContract = typeof mainApiContract
export type MainApiMethod = keyof MainApiContract

export type MainApiInput<M extends MainApiMethod> = z.input<MainApiContract[M]['input']>
export type MainApiOutput<M extends MainApiMethod> = z.output<MainApiContract[M]['output']>

/**
 * Fully-typed async API surface derived from {@link mainApiContract}.
 *
 * Each {@link MainApiMethod} key becomes a function that accepts the method's
 * validated input type and resolves to the validated output type.
 */
export type MainApi = {
	[M in MainApiMethod]: (input: MainApiInput<M>) => Promise<MainApiOutput<M>>
}
