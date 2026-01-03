import { z } from 'zod'
import { CommandDefinition } from '../ControlApi'

export const assetTypeSchema = z
	.enum([
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
	.describe('Supported asset types in the project')

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

export const assetNodeSchema: z.ZodType<AssetNode> = z.lazy(() => {
	const base = z.object({
		id: z.string().describe('Unique identifier for the asset'),
		name: z.string().describe('Display name of the asset'),
		path: z.string().min(1).describe('Project-relative path to the asset'),
	})

	const imageSchema = base
		.extend({
			type: z.literal('image').describe('Image asset type'),
			size: z
				.object({
					w: z.number().describe('Width in pixels'),
					h: z.number().describe('Height in pixels'),
				})
				.strict()
				.describe('Dimensions of the image'),
			scale9Borders: z
				.object({
					x: z.number().describe('X offset for scale9 borders'),
					y: z.number().describe('Y offset for scale9 borders'),
					w: z.number().describe('Width of the center slice'),
					h: z.number().describe('Height of the center slice'),
				})
				.strict()
				.optional()
				.describe('Scale9 border definitions'),
		})
		.strict()

	const jsonSchema = base
		.extend({
			type: z.literal('json').describe('JSON asset type'),
		})
		.strict()

	const xmlSchema = base
		.extend({
			type: z.literal('xml').describe('XML asset type'),
		})
		.strict()

	const folderSchema = base
		.extend({
			type: z.literal('folder').describe('Folder asset type'),
			children: z.array(assetNodeSchema).describe('Assets contained within this folder'),
		})
		.strict()

	const fileSchema = base
		.extend({
			type: z.literal('file').describe('Generic file asset type'),
		})
		.strict()

	const prefabSchema = base
		.extend({
			type: z.literal('prefab').describe('Prefab asset type'),
		})
		.strict()

	const webFontSchema = base
		.extend({
			type: z.literal('web-font').describe('Web font asset type'),
			fontFamily: z.string().min(1).describe('The font family name'),
		})
		.strict()

	const bitmapFontSchema = base
		.extend({
			type: z.literal('bitmap-font').describe('Bitmap font asset type'),
			image: imageSchema.describe('Texture used by the bitmap font'),
			data: z.union([jsonSchema, xmlSchema]).describe('Metadata for the bitmap font (JSON or XML)'),
			imageExtra: z
				.object({
					atlas: z.string().min(1).describe('Path to the atlas file'),
					texture: z.string().min(1).describe('Path to the texture file'),
					texturePacker: z.string().min(1).describe('Path to the texture packer metadata'),
				})
				.strict()
				.optional()
				.describe('Extra image metadata for bitmap fonts'),
		})
		.strict()

	const spritesheetFrameSchema = base
		.extend({
			type: z.literal('spritesheet-frame').describe('Single frame within a spritesheet'),
			imagePath: z.string().min(1).describe('Path to the spritesheet image'),
			jsonPath: z.string().min(1).describe('Path to the spritesheet JSON metadata'),
			pathInHierarchy: z.string().min(1).describe('Virtual path used for display in the hierarchy'),
			size: z
				.object({
					w: z.number().describe('Width of the frame'),
					h: z.number().describe('Height of the frame'),
				})
				.strict()
				.describe('Dimensions of the frame'),
			anchor: z
				.object({
					x: z.number().describe('X coordinate of the anchor point'),
					y: z.number().describe('Y coordinate of the anchor point'),
				})
				.strict()
				.describe('Anchor point of the frame'),
			scale9Borders: z
				.object({
					x: z.number().describe('X offset for scale9 borders'),
					y: z.number().describe('Y offset for scale9 borders'),
					w: z.number().describe('Width of the center slice'),
					h: z.number().describe('Height of the center slice'),
				})
				.strict()
				.optional()
				.describe('Scale9 border definitions for the frame'),
			project: z.string().optional().describe('Project identifier'),
			parentId: z.string().optional().describe('ID of the parent container'),
		})
		.strict()

	const spritesheetFolderSchema = base
		.extend({
			type: z.literal('spritesheet-folder').describe('Virtual folder within a spritesheet'),
			imagePath: z.string().min(1).describe('Path to the spritesheet image'),
			jsonPath: z.string().min(1).describe('Path to the spritesheet JSON metadata'),
			children: z.array(spritesheetFrameSchema).describe('Frames contained in this folder'),
			project: z.string().optional().describe('Project identifier'),
		})
		.strict()

	const spritesheetSchema = base
		.extend({
			type: z.literal('spritesheet').describe('Spritesheet asset type'),
			image: imageSchema.describe('Main texture of the spritesheet'),
			json: jsonSchema.describe('JSON metadata of the spritesheet'),
			frames: z
				.array(z.union([spritesheetFrameSchema, spritesheetFolderSchema]))
				.describe('All frames and folders in the spritesheet'),
			project: z.string().optional().describe('Project identifier'),
		})
		.strict()

	return z
		.discriminatedUnion('type', [
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
		.describe('Union of all possible asset node types')
})

export const listAssetsCommand = {
	group: 'assets',
	description: 'Lists all assets in the project, optionally filtered by type.',
	input: z
		.object({
			types: z.array(assetTypeSchema).optional().describe('Optional list of asset types to include'),
		})
		.strict()
		.describe('Input parameters for listing assets'),
	output: z
		.object({
			assets: z.array(assetNodeSchema).describe('List of asset nodes matching the filter'),
		})
		.strict()
		.describe('Response containing the list of assets'),
} satisfies CommandDefinition
