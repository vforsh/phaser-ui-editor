import { z } from 'zod'
export declare const takeAppPartScreenshotCommand: {
	group: 'debug'
	description: string
	input: z.ZodObject<
		{
			selector: z.ZodString
			format: z.ZodOptional<z.ZodEnum<['png', 'jpg', 'webp']>>
			quality: z.ZodOptional<z.ZodNumber>
			scale: z.ZodOptional<z.ZodNumber>
			includeFixed: z.ZodOptional<z.ZodEnum<['none', 'intersecting', 'all']>>
			backgroundColor: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>
			clipToViewport: z.ZodOptional<z.ZodBoolean>
		},
		'strict',
		z.ZodTypeAny,
		{
			selector: string
			format?: 'png' | 'jpg' | 'webp' | undefined
			quality?: number | undefined
			scale?: number | undefined
			includeFixed?: 'all' | 'none' | 'intersecting' | undefined
			backgroundColor?: string | null | undefined
			clipToViewport?: boolean | undefined
		},
		{
			selector: string
			format?: 'png' | 'jpg' | 'webp' | undefined
			quality?: number | undefined
			scale?: number | undefined
			includeFixed?: 'all' | 'none' | 'intersecting' | undefined
			backgroundColor?: string | null | undefined
			clipToViewport?: boolean | undefined
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
//# sourceMappingURL=takeAppPartScreenshot.d.ts.map
