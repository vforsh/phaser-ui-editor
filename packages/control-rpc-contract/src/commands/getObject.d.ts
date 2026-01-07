import { z } from 'zod'
export declare const getObjectCommand: {
	group: 'objects'
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
	output: z.ZodUnknown
}
//# sourceMappingURL=getObject.d.ts.map
