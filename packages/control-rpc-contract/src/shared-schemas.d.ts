import { z } from 'zod'
/**
 * Shared schemas that must not depend on `ControlApi.ts` to avoid ESM circular-import TDZ issues.
 */
export declare const successSchema: z.ZodObject<
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
export declare const objectSelectorV0Schema: z.ZodUnion<
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
export type ObjectSelectorV0 = z.infer<typeof objectSelectorV0Schema>
export declare const commandErrorSchema: z.ZodObject<
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
export declare const commandBlockedSchema: z.ZodObject<
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
export declare const okResultSchema: z.ZodUnion<
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
export declare const okCreatedIdResultSchema: z.ZodUnion<
	[
		z.ZodObject<
			{
				ok: z.ZodLiteral<true>
				createdId: z.ZodString
			},
			'strict',
			z.ZodTypeAny,
			{
				ok: true
				createdId: string
			},
			{
				ok: true
				createdId: string
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
//# sourceMappingURL=shared-schemas.d.ts.map
