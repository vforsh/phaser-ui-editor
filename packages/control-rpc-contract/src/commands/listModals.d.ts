import { z } from 'zod'
export declare const listModalsCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
	output: z.ZodObject<
		{
			activeModalId: z.ZodNullable<z.ZodEnum<['settings', 'controlRpcCommands']>>
			modals: z.ZodArray<
				z.ZodObject<
					{
						id: z.ZodEnum<['settings', 'controlRpcCommands']>
						isOpen: z.ZodBoolean
					},
					'strict',
					z.ZodTypeAny,
					{
						id: 'settings' | 'controlRpcCommands'
						isOpen: boolean
					},
					{
						id: 'settings' | 'controlRpcCommands'
						isOpen: boolean
					}
				>,
				'many'
			>
		},
		'strict',
		z.ZodTypeAny,
		{
			activeModalId: 'settings' | 'controlRpcCommands' | null
			modals: {
				id: 'settings' | 'controlRpcCommands'
				isOpen: boolean
			}[]
		},
		{
			activeModalId: 'settings' | 'controlRpcCommands' | null
			modals: {
				id: 'settings' | 'controlRpcCommands'
				isOpen: boolean
			}[]
		}
	>
}
//# sourceMappingURL=listModals.d.ts.map
