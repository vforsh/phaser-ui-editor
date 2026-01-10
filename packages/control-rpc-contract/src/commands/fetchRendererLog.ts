import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { rendererLogFileNameSchema, rendererLogRunIdSchema } from './listRendererLogs.js'

const sessionHeaderSchema = z
	.object({
		startLine: z.number().int().min(1),
		endLine: z.number().int().min(1),
		text: z.array(z.string()).describe('Session header lines (no trailing newline characters).'),
	})
	.strict()
	.describe('Session header block extracted from the log file.')

const tailSchema = z
	.object({
		startLine: z.number().int().min(1),
		endLine: z.number().int().min(0),
		text: z.array(z.string()).describe('Tail lines (no trailing newline characters).'),
		markerLine: z.number().int().min(1).optional(),
	})
	.strict()
	.describe('Log tail section (either full or after the last PAGE RELOADED marker).')

const truncationSchema = z
	.object({
		originalLines: z.number().int().min(0),
		keptLines: z.number().int().min(0),
		reason: z.literal('maxLines'),
	})
	.strict()
	.describe('Tail truncation metadata when maxLines is applied.')

export const fetchRendererLogCommand = {
	group: 'debug',
	kind: 'read',
	description: 'Fetch renderer log tail output and optional session header.',
	input: z
		.object({
			fileName: rendererLogFileNameSchema.optional().describe('Renderer log file name to fetch.'),
			runId: rendererLogRunIdSchema.optional().describe('Renderer log run id to fetch.'),
			full: z.boolean().optional().describe('When true, return the full log content.'),
			maxLines: z.number().int().positive().optional().describe('Limit tail to the last N lines.'),
		})
		.strict()
		.describe('Input parameters for fetchRendererLog.'),
	output: z
		.object({
			file: z
				.object({
					fileName: rendererLogFileNameSchema,
					runId: rendererLogRunIdSchema,
				})
				.strict()
				.describe('Selected renderer log file.'),
			sessionHeader: sessionHeaderSchema.nullable().describe('Session header block when present.'),
			tail: tailSchema,
			truncated: z.boolean(),
			truncation: truncationSchema.optional(),
		})
		.strict()
		.describe('Renderer log tail result.'),
} satisfies CommandDefinition
