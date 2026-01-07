import { z } from 'zod'
export declare const getPrefabDocumentCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
	output: z.ZodObject<
		{
			kind: z.ZodLiteral<'expanded'>
			content: z.ZodUnknown
		},
		'strict',
		z.ZodTypeAny,
		{
			kind: 'expanded'
			content?: unknown
		},
		{
			kind: 'expanded'
			content?: unknown
		}
	>
}
//# sourceMappingURL=getPrefabDocument.d.ts.map
