import { z } from 'zod'
export declare const createPrefabAssetCommand: {
	group: 'assets'
	description: string
	input: z.ZodObject<
		{
			path: z.ZodString
			prefabData: z.ZodOptional<z.ZodUnknown>
		},
		'strict',
		z.ZodTypeAny,
		{
			path: string
			prefabData?: unknown
		},
		{
			path: string
			prefabData?: unknown
		}
	>
	output: z.ZodObject<
		{
			assetId: z.ZodString
			path: z.ZodString
		},
		'strict',
		z.ZodTypeAny,
		{
			path: string
			assetId: string
		},
		{
			path: string
			assetId: string
		}
	>
}
//# sourceMappingURL=createPrefabAsset.d.ts.map
