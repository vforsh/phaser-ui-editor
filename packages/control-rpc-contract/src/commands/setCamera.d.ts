import { z } from 'zod'
export declare const setCameraCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<
		{
			zoom: z.ZodOptional<z.ZodNumber>
			scrollX: z.ZodOptional<z.ZodNumber>
			scrollY: z.ZodOptional<z.ZodNumber>
		},
		'strict',
		z.ZodTypeAny,
		{
			zoom?: number | undefined
			scrollX?: number | undefined
			scrollY?: number | undefined
		},
		{
			zoom?: number | undefined
			scrollX?: number | undefined
			scrollY?: number | undefined
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
//# sourceMappingURL=setCamera.d.ts.map
