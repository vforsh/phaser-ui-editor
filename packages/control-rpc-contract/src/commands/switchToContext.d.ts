import { z } from 'zod'
export declare const switchToContextCommand: {
	group: 'misc'
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
//# sourceMappingURL=switchToContext.d.ts.map
