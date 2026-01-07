import { z } from 'zod'
export declare const deleteObjectsCommand: {
	group: 'objects'
	description: string
	input: z.ZodObject<
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
//# sourceMappingURL=deleteObjects.d.ts.map
