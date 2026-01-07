import { z } from 'zod'
export declare const selectAssetsCommand: {
	group: 'assets'
	description: string
	input: z.ZodObject<
		{
			assets: z.ZodArray<
				z.ZodUnion<
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
				>,
				'many'
			>
		},
		'strict',
		z.ZodTypeAny,
		{
			assets: (
				| {
						id: string
				  }
				| {
						path: string
				  }
			)[]
		},
		{
			assets: (
				| {
						id: string
				  }
				| {
						path: string
				  }
			)[]
		}
	>
	output: z.ZodObject<
		{
			assetIds: z.ZodArray<z.ZodString, 'many'>
		},
		'strict',
		z.ZodTypeAny,
		{
			assetIds: string[]
		},
		{
			assetIds: string[]
		}
	>
}
//# sourceMappingURL=selectAssets.d.ts.map
