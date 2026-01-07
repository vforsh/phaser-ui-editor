import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'

export const controlMetaMethodSchema = z
	.object({
		method: z.string().min(1).describe('Control RPC method name'),
		group: z.string().min(1).describe('Method group label'),
		description: z.string().min(1).describe('Method description'),
		inputSchema: z.unknown().describe('JSON Schema for the method input'),
		outputSchema: z.unknown().describe('JSON Schema for the method output'),
	})
	.strict()

export const controlMetaSchema = z
	.object({
		schemaVersion: z.number().int().describe('Control RPC discovery schema version'),
		methods: z.array(controlMetaMethodSchema).describe('Control RPC method metadata'),
		appVersion: z.string().optional().describe('App version string when available'),
		generatedAt: z.string().optional().describe('ISO timestamp when metadata was generated'),
	})
	.strict()

export type ControlMetaMethod = z.infer<typeof controlMetaMethodSchema>
export type ControlMeta = z.infer<typeof controlMetaSchema>

export const getControlMetaCommand = {
	group: 'debug',
	description: 'Returns control RPC method metadata and JSON schemas.',
	input: z.object({}).strict().describe('No parameters.'),
	output: controlMetaSchema.describe('Control RPC metadata and JSON schemas.'),
} satisfies CommandDefinition
