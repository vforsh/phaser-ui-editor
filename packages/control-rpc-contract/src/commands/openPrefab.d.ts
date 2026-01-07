import { z } from 'zod'
export declare const openPrefabCommand: {
	group: 'assets'
	description: string
	input: z.ZodUnion<
		[
			z.ZodObject<
				{
					assetId: z.ZodString
				},
				'strict',
				z.ZodTypeAny,
				{
					assetId: string
				},
				{
					assetId: string
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
	output: z.ZodObject<
		{
			success: z.ZodLiteral<true>
		},
		'strict',
		z.ZodTypeAny,
		{
			success: true
		},
		{
			success: true
		}
	>
}
//# sourceMappingURL=openPrefab.d.ts.map
