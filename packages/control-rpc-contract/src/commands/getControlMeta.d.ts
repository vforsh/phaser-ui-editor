import { z } from 'zod'
export declare const controlMetaMethodSchema: z.ZodObject<
	{
		method: z.ZodString
		group: z.ZodString
		description: z.ZodString
		inputSchema: z.ZodUnknown
		outputSchema: z.ZodUnknown
	},
	'strict',
	z.ZodTypeAny,
	{
		method: string
		group: string
		description: string
		inputSchema?: unknown
		outputSchema?: unknown
	},
	{
		method: string
		group: string
		description: string
		inputSchema?: unknown
		outputSchema?: unknown
	}
>
export declare const controlMetaSchema: z.ZodObject<
	{
		schemaVersion: z.ZodNumber
		methods: z.ZodArray<
			z.ZodObject<
				{
					method: z.ZodString
					group: z.ZodString
					description: z.ZodString
					inputSchema: z.ZodUnknown
					outputSchema: z.ZodUnknown
				},
				'strict',
				z.ZodTypeAny,
				{
					method: string
					group: string
					description: string
					inputSchema?: unknown
					outputSchema?: unknown
				},
				{
					method: string
					group: string
					description: string
					inputSchema?: unknown
					outputSchema?: unknown
				}
			>,
			'many'
		>
		appVersion: z.ZodOptional<z.ZodString>
		generatedAt: z.ZodOptional<z.ZodString>
	},
	'strict',
	z.ZodTypeAny,
	{
		schemaVersion: number
		methods: {
			method: string
			group: string
			description: string
			inputSchema?: unknown
			outputSchema?: unknown
		}[]
		appVersion?: string | undefined
		generatedAt?: string | undefined
	},
	{
		schemaVersion: number
		methods: {
			method: string
			group: string
			description: string
			inputSchema?: unknown
			outputSchema?: unknown
		}[]
		appVersion?: string | undefined
		generatedAt?: string | undefined
	}
>
export type ControlMetaMethod = z.infer<typeof controlMetaMethodSchema>
export type ControlMeta = z.infer<typeof controlMetaSchema>
export declare const getControlMetaCommand: {
	group: 'debug'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
	output: z.ZodObject<
		{
			schemaVersion: z.ZodNumber
			methods: z.ZodArray<
				z.ZodObject<
					{
						method: z.ZodString
						group: z.ZodString
						description: z.ZodString
						inputSchema: z.ZodUnknown
						outputSchema: z.ZodUnknown
					},
					'strict',
					z.ZodTypeAny,
					{
						method: string
						group: string
						description: string
						inputSchema?: unknown
						outputSchema?: unknown
					},
					{
						method: string
						group: string
						description: string
						inputSchema?: unknown
						outputSchema?: unknown
					}
				>,
				'many'
			>
			appVersion: z.ZodOptional<z.ZodString>
			generatedAt: z.ZodOptional<z.ZodString>
		},
		'strict',
		z.ZodTypeAny,
		{
			schemaVersion: number
			methods: {
				method: string
				group: string
				description: string
				inputSchema?: unknown
				outputSchema?: unknown
			}[]
			appVersion?: string | undefined
			generatedAt?: string | undefined
		},
		{
			schemaVersion: number
			methods: {
				method: string
				group: string
				description: string
				inputSchema?: unknown
				outputSchema?: unknown
			}[]
			appVersion?: string | undefined
			generatedAt?: string | undefined
		}
	>
}
//# sourceMappingURL=getControlMeta.d.ts.map
