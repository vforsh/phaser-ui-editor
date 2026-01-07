import { z } from 'zod'
export declare const createObjectCommand: {
	group: 'objects'
	description: string
	input: z.ZodObject<
		{
			parent: z.ZodUnion<
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
			type: z.ZodEnum<['Container', 'Image', 'NineSlice', 'Text', 'BitmapText']>
		},
		'strict',
		z.ZodTypeAny,
		{
			type: 'Container' | 'Image' | 'NineSlice' | 'Text' | 'BitmapText'
			parent:
				| {
						id: string
				  }
				| {
						path: string
				  }
		},
		{
			type: 'Container' | 'Image' | 'NineSlice' | 'Text' | 'BitmapText'
			parent:
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
}
export declare const createObjectFromAssetCommand: {
	group: 'objects'
	description: string
	input: z.ZodObject<
		{
			parent: z.ZodUnion<
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
			assetId: z.ZodString
			position: z.ZodOptional<
				z.ZodObject<
					{
						x: z.ZodNumber
						y: z.ZodNumber
					},
					'strict',
					z.ZodTypeAny,
					{
						x: number
						y: number
					},
					{
						x: number
						y: number
					}
				>
			>
		},
		'strict',
		z.ZodTypeAny,
		{
			parent:
				| {
						id: string
				  }
				| {
						path: string
				  }
			assetId: string
			position?:
				| {
						x: number
						y: number
				  }
				| undefined
		},
		{
			parent:
				| {
						id: string
				  }
				| {
						path: string
				  }
			assetId: string
			position?:
				| {
						x: number
						y: number
				  }
				| undefined
		}
	>
	output: z.ZodUnion<
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
}
//# sourceMappingURL=createObject.d.ts.map
