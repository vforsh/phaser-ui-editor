import { z } from 'zod'
export declare const getCanvasMetricsCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
	output: z.ZodObject<
		{
			width: z.ZodNumber
			height: z.ZodNumber
			isConnected: z.ZodBoolean
			currentPrefabAssetId: z.ZodOptional<z.ZodString>
		},
		'strict',
		z.ZodTypeAny,
		{
			width: number
			height: number
			isConnected: boolean
			currentPrefabAssetId?: string | undefined
		},
		{
			width: number
			height: number
			isConnected: boolean
			currentPrefabAssetId?: string | undefined
		}
	>
}
//# sourceMappingURL=getCanvasMetrics.d.ts.map
