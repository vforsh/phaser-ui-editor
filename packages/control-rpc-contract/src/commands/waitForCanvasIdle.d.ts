import { z } from 'zod'
export declare const waitForCanvasIdleCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<
		{
			timeoutMs: z.ZodOptional<z.ZodNumber>
			pollMs: z.ZodOptional<z.ZodNumber>
		},
		'strict',
		z.ZodTypeAny,
		{
			timeoutMs?: number | undefined
			pollMs?: number | undefined
		},
		{
			timeoutMs?: number | undefined
			pollMs?: number | undefined
		}
	>
	output: z.ZodUnion<
		[
			z.ZodObject<
				{
					ok: z.ZodLiteral<true>
				},
				'strict',
				z.ZodTypeAny,
				{
					ok: true
				},
				{
					ok: true
				}
			>,
			z.ZodObject<
				{
					ok: z.ZodLiteral<false>
					error: z.ZodObject<
						{
							kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
							message: z.ZodString
						},
						'strict',
						z.ZodTypeAny,
						{
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						},
						{
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					>
				},
				'strict',
				z.ZodTypeAny,
				{
					ok: false
					error: {
						message: string
						kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
					}
				},
				{
					ok: false
					error: {
						message: string
						kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
					}
				}
			>,
			z.ZodObject<
				{
					ok: z.ZodLiteral<false>
					blocked: z.ZodObject<
						{
							reason: z.ZodString
							message: z.ZodOptional<z.ZodString>
						},
						'strict',
						z.ZodTypeAny,
						{
							reason: string
							message?: string | undefined
						},
						{
							reason: string
							message?: string | undefined
						}
					>
				},
				'strict',
				z.ZodTypeAny,
				{
					ok: false
					blocked: {
						reason: string
						message?: string | undefined
					}
				},
				{
					ok: false
					blocked: {
						reason: string
						message?: string | undefined
					}
				}
			>,
		]
	>
}
//# sourceMappingURL=waitForCanvasIdle.d.ts.map
