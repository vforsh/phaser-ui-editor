import { z } from 'zod'
export declare const assetTypeSchema: z.ZodEnum<
	[
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
	]
>
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
	children?: AssetNode[]
	image?: {
		type: 'image'
		id: string
		name: string
		path: string
		size: {
			w: number
			h: number
		}
		scale9Borders?: {
			x: number
			y: number
			w: number
			h: number
		}
	}
	json?: {
		type: 'json'
		id: string
		name: string
		path: string
	}
	frames?: (AssetNode &
		(
			| {
					type: 'spritesheet-frame'
			  }
			| {
					type: 'spritesheet-folder'
			  }
		))[]
	project?: string
	fontFamily?: string
	imageExtra?: {
		atlas: string
		texture: string
		texturePacker: string
	}
	data?: {
		type: 'json' | 'xml'
		id: string
		name: string
		path: string
	}
	imagePath?: string
	jsonPath?: string
	pathInHierarchy?: string
	size?: {
		w: number
		h: number
	}
	anchor?: {
		x: number
		y: number
	}
	scale9Borders?: {
		x: number
		y: number
		w: number
		h: number
	}
	parentId?: string
}
export declare const assetNodeSchema: z.ZodType<AssetNode>
export declare const listAssetsCommand: {
	group: 'assets'
	description: string
	input: z.ZodObject<
		{
			types: z.ZodOptional<
				z.ZodArray<
					z.ZodEnum<
						[
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
						]
					>,
					'many'
				>
			>
		},
		'strict',
		z.ZodTypeAny,
		{
			types?:
				| (
						| 'folder'
						| 'file'
						| 'json'
						| 'xml'
						| 'image'
						| 'prefab'
						| 'web-font'
						| 'bitmap-font'
						| 'spritesheet'
						| 'spritesheet-folder'
						| 'spritesheet-frame'
				  )[]
				| undefined
		},
		{
			types?:
				| (
						| 'folder'
						| 'file'
						| 'json'
						| 'xml'
						| 'image'
						| 'prefab'
						| 'web-font'
						| 'bitmap-font'
						| 'spritesheet'
						| 'spritesheet-folder'
						| 'spritesheet-frame'
				  )[]
				| undefined
		}
	>
	output: z.ZodObject<
		{
			assets: z.ZodArray<z.ZodType<AssetNode, z.ZodTypeDef, AssetNode>, 'many'>
		},
		'strict',
		z.ZodTypeAny,
		{
			assets: AssetNode[]
		},
		{
			assets: AssetNode[]
		}
	>
}
//# sourceMappingURL=listAssets.d.ts.map
