import { z } from 'zod'
export declare const openModalCommand: {
	group: 'misc'
	description: string
	input: z.ZodDiscriminatedUnion<
		'id',
		[
			z.ZodObject<
				{
					id: z.ZodLiteral<'settings'>
					params: z.ZodOptional<
						z.ZodObject<
							{
								sectionId: z.ZodEnum<['general', 'hierarchy', 'canvas', 'assets', 'inspector', 'dev', 'misc']>
							},
							'strict',
							z.ZodTypeAny,
							{
								sectionId: 'assets' | 'hierarchy' | 'misc' | 'general' | 'canvas' | 'inspector' | 'dev'
							},
							{
								sectionId: 'assets' | 'hierarchy' | 'misc' | 'general' | 'canvas' | 'inspector' | 'dev'
							}
						>
					>
				},
				'strict',
				z.ZodTypeAny,
				{
					id: 'settings'
					params?:
						| {
								sectionId: 'assets' | 'hierarchy' | 'misc' | 'general' | 'canvas' | 'inspector' | 'dev'
						  }
						| undefined
				},
				{
					id: 'settings'
					params?:
						| {
								sectionId: 'assets' | 'hierarchy' | 'misc' | 'general' | 'canvas' | 'inspector' | 'dev'
						  }
						| undefined
				}
			>,
			z.ZodObject<
				{
					id: z.ZodLiteral<'controlRpcCommands'>
					params: z.ZodOptional<
						z.ZodObject<
							{
								group: z.ZodEnum<['assets', 'objects', 'hierarchy', 'misc', 'debug', 'all']>
							},
							'strict',
							z.ZodTypeAny,
							{
								group: 'debug' | 'assets' | 'objects' | 'hierarchy' | 'misc' | 'all'
							},
							{
								group: 'debug' | 'assets' | 'objects' | 'hierarchy' | 'misc' | 'all'
							}
						>
					>
				},
				'strict',
				z.ZodTypeAny,
				{
					id: 'controlRpcCommands'
					params?:
						| {
								group: 'debug' | 'assets' | 'objects' | 'hierarchy' | 'misc' | 'all'
						  }
						| undefined
				},
				{
					id: 'controlRpcCommands'
					params?:
						| {
								group: 'debug' | 'assets' | 'objects' | 'hierarchy' | 'misc' | 'all'
						  }
						| undefined
				}
			>,
		]
	>
	output: z.ZodObject<
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
}
export type OpenModalInput = z.input<typeof openModalCommand.input>
//# sourceMappingURL=openModal.d.ts.map
