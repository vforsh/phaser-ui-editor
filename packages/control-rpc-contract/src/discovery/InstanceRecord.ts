import { z } from 'zod'

import { APP_ID } from './constants.js'

const e2eSchema = z
	.discriminatedUnion('enabled', [
		z
			.object({
				enabled: z.literal(false),
			})
			.strict(),
		z
			.object({
				enabled: z.literal(true),
				instanceKey: z.string().min(1),
			})
			.strict(),
	])
	.describe(
		'E2E mode metadata. Either { enabled: false } or { enabled: true, instanceKey: "..." } for distinguishing Playwright-launched app instances.',
	)

export const instanceRecordSchema = z
	.object({
		schemaVersion: z.literal(1),
		appId: z.literal(APP_ID),
		instanceId: z.string().min(1),
		pid: z.number().int(),
		wsPort: z.number().int().positive(),
		wsUrl: z.string(),
		appLaunchDir: z.string(),
		projectPath: z.string().nullable(),
		startedAt: z.number().int(),
		updatedAt: z.number().int(),
		appVersion: z.string().optional(),
		e2e: e2eSchema.optional(),
	})
	.strict()

export type InstanceRecord = z.output<typeof instanceRecordSchema>
export type InstanceRecordInput = z.input<typeof instanceRecordSchema>
