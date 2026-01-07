import { z } from 'zod'
export declare const patchObjectComponentCommand: {
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
			component: z.ZodUnion<
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
							type: z.ZodString
						},
						'strict',
						z.ZodTypeAny,
						{
							type: string
						},
						{
							type: string
						}
					>,
				]
			>
			patch: z.ZodRecord<z.ZodString, z.ZodUnknown>
		},
		'strict',
		z.ZodTypeAny,
		{
			target:
				| {
						id: string
				  }
				| {
						path: string
				  }
			patch: Record<string, unknown>
			component:
				| {
						id: string
				  }
				| {
						type: string
				  }
		},
		{
			target:
				| {
						id: string
				  }
				| {
						path: string
				  }
			patch: Record<string, unknown>
			component:
				| {
						id: string
				  }
				| {
						type: string
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
//# sourceMappingURL=patchObjectComponent.d.ts.map
