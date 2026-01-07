import { z } from 'zod'
export declare const renameObjectCommand: {
	group: 'objects'
	description: string
	input: z.ZodObject<
		{
			target: z.ZodUnion<
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
			name: z.ZodString
		},
		'strict',
		z.ZodTypeAny,
		{
			name: string
			target:
				| {
						id: string
				  }
				| {
						path: string
				  }
		},
		{
			name: string
			target:
				| {
						id: string
				  }
				| {
						path: string
				  }
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
//# sourceMappingURL=renameObject.d.ts.map
