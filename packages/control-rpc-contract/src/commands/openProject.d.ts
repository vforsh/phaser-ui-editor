import { z } from 'zod'
export declare const openProjectCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<
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
//# sourceMappingURL=openProject.d.ts.map
