import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

const RUN_ID_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/
const FILE_NAME_REGEX = /^renderer-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/

export const rendererLogRunIdSchema = z.string().regex(RUN_ID_REGEX).describe('Renderer log run id in the renderer-<runId>.log filename.')

export const rendererLogFileNameSchema = z.string().regex(FILE_NAME_REGEX).describe('Renderer log file name (renderer-<runId>.log).')

export const rendererLogDescriptorSchema = z
	.object({
		fileName: rendererLogFileNameSchema,
		runId: rendererLogRunIdSchema,
		mtimeMs: z.number().optional().describe('Last modification time in milliseconds since epoch.'),
		sizeBytes: z.number().optional().describe('File size in bytes.'),
	})
	.strict()
	.describe('Renderer log file descriptor without filesystem paths.')

export type RendererLogDescriptor = z.infer<typeof rendererLogDescriptorSchema>

export const listRendererLogsCommand = {
	group: 'debug',
	kind: 'read',
	description: 'List renderer log files from the running editor logs directory.',
	input: z.object({}).strict().describe('Input parameters for listRendererLogs (empty).'),
	output: z.array(rendererLogDescriptorSchema).describe('Renderer log files sorted newest first.'),
} satisfies CommandDefinition
