import { z } from 'zod'
export declare const listEditorsCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
	output: z.ZodArray<
		z.ZodObject<
			{
				wsUrl: z.ZodString
				wsPort: z.ZodNumber
				appLaunchDir: z.ZodString
				projectPath: z.ZodNullable<z.ZodString>
				e2e: z.ZodDiscriminatedUnion<
					'enabled',
					[
						z.ZodObject<
							{
								enabled: z.ZodLiteral<false>
							},
							'strict',
							z.ZodTypeAny,
							{
								enabled: false
							},
							{
								enabled: false
							}
						>,
						z.ZodObject<
							{
								enabled: z.ZodLiteral<true>
								instanceKey: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								enabled: true
								instanceKey: string
							},
							{
								enabled: true
								instanceKey: string
							}
						>,
					]
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				wsUrl: string
				wsPort: number
				appLaunchDir: string
				projectPath: string | null
				e2e:
					| {
							enabled: false
					  }
					| {
							enabled: true
							instanceKey: string
					  }
			},
			{
				wsUrl: string
				wsPort: number
				appLaunchDir: string
				projectPath: string | null
				e2e:
					| {
							enabled: false
					  }
					| {
							enabled: true
							instanceKey: string
					  }
			}
		>,
		'many'
	>
}
//# sourceMappingURL=listEditors.d.ts.map
