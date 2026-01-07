import { z } from 'zod'
export declare const closeAllModalsCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
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
//# sourceMappingURL=closeAllModals.d.ts.map
