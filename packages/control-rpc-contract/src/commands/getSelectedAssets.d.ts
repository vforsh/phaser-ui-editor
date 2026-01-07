import { z } from 'zod'
export declare const getSelectedAssetsCommand: {
	group: 'assets'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
	output: z.ZodObject<
		{
			ids: z.ZodArray<z.ZodString, 'many'>
		},
		'strict',
		z.ZodTypeAny,
		{
			ids: string[]
		},
		{
			ids: string[]
		}
	>
}
//# sourceMappingURL=getSelectedAssets.d.ts.map
