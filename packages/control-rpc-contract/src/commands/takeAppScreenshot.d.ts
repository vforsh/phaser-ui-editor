import { z } from 'zod'
export declare const takeAppScreenshotCommand: {
	group: 'debug'
	description: string
	input: z.ZodObject<
		{
			clean: z.ZodOptional<z.ZodBoolean>
			format: z.ZodOptional<z.ZodEnum<['png', 'jpg', 'webp']>>
		},
		'strict',
		z.ZodTypeAny,
		{
			format?: 'png' | 'jpg' | 'webp' | undefined
			clean?: boolean | undefined
		},
		{
			format?: 'png' | 'jpg' | 'webp' | undefined
			clean?: boolean | undefined
		}
	>
	output: z.ZodObject<
		{
			path: z.ZodEffects<z.ZodString, string, string>
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
}
//# sourceMappingURL=takeAppScreenshot.d.ts.map
