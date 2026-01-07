import { z } from 'zod'
export declare const getAssetInfoCommand: {
	group: 'assets'
	description: string
	input: z.ZodUnion<
		[
			z.ZodObject<
				{
					id: z.ZodString
				},
				'strict',
				z.ZodTypeAny,
				{
					id: string
				},
				{
					id: string
				}
			>,
			z.ZodObject<
				{
					path: z.ZodString
				},
				'strict',
				z.ZodTypeAny,
				{
					path: string
				},
				{
					path: string
				}
			>,
		]
	>
	output: z.ZodType<import('./listAssets').AssetNode, z.ZodTypeDef, import('./listAssets').AssetNode>
}
//# sourceMappingURL=getAssetInfo.d.ts.map
