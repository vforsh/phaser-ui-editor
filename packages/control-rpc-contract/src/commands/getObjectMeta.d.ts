import { z } from 'zod'
export declare const getObjectMetaCommand: {
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
		},
		{
			target:
				| {
						id: string
				  }
				| {
						path: string
				  }
		}
	>
	output: z.ZodObject<
		{
			id: z.ZodString
			name: z.ZodString
			type: z.ZodString
			path: z.ZodOptional<z.ZodString>
		},
		'strict',
		z.ZodTypeAny,
		{
			type: string
			name: string
			id: string
			path?: string | undefined
		},
		{
			type: string
			name: string
			id: string
			path?: string | undefined
		}
	>
}
//# sourceMappingURL=getObjectMeta.d.ts.map
