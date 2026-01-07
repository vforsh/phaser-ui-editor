import { z } from 'zod'
export declare const closeModalCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<
		{
			id: z.ZodEnum<['settings', 'controlRpcCommands']>
		},
		'strict',
		z.ZodTypeAny,
		{
			id: 'settings' | 'controlRpcCommands'
		},
		{
			id: 'settings' | 'controlRpcCommands'
		}
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
//# sourceMappingURL=closeModal.d.ts.map
