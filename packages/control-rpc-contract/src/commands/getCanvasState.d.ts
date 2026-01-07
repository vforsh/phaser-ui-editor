import { z } from 'zod'
export declare const getCanvasStateCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
	output: z.ZodObject<
		{
			currentPrefab: z.ZodOptional<
				z.ZodObject<
					{
						id: z.ZodString
						name: z.ZodString
					},
					'strip',
					z.ZodTypeAny,
					{
						name: string
						id: string
					},
					{
						name: string
						id: string
					}
				>
			>
			activeContextId: z.ZodOptional<z.ZodString>
			selectionIds: z.ZodArray<z.ZodString, 'many'>
			hasUnsavedChanges: z.ZodBoolean
			camera: z.ZodObject<
				{
					zoom: z.ZodNumber
					scrollX: z.ZodNumber
					scrollY: z.ZodNumber
				},
				'strict',
				z.ZodTypeAny,
				{
					zoom: number
					scrollX: number
					scrollY: number
				},
				{
					zoom: number
					scrollX: number
					scrollY: number
				}
			>
		},
		'strict',
		z.ZodTypeAny,
		{
			selectionIds: string[]
			hasUnsavedChanges: boolean
			camera: {
				zoom: number
				scrollX: number
				scrollY: number
			}
			currentPrefab?:
				| {
						name: string
						id: string
				  }
				| undefined
			activeContextId?: string | undefined
		},
		{
			selectionIds: string[]
			hasUnsavedChanges: boolean
			camera: {
				zoom: number
				scrollX: number
				scrollY: number
			}
			currentPrefab?:
				| {
						name: string
						id: string
				  }
				| undefined
			activeContextId?: string | undefined
		}
	>
}
//# sourceMappingURL=getCanvasState.d.ts.map
