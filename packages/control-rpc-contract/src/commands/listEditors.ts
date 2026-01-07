import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

export const listEditorsCommand = {
	group: 'misc',
	kind: 'read',
	description: 'Lists all currently running editor windows and their associated projects.',
	input: z.object({}).strict().describe('Input parameters for listing editors (empty)'),
	output: z
		.array(
			z
				.object({
					wsUrl: z.string().describe('WebSocket JSON-RPC address for this editor instance (e.g. ws://127.0.0.1:17870)'),
					wsPort: z.number().describe('WebSocket port for this editor instance'),
					appLaunchDir: z.string().describe('Directory the editor app instance was launched from (process.cwd())'),
					projectPath: z.string().nullable().describe('Path to the project open in this window'),
					e2e: z
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
						),
				})
				.strict(),
		)
		.describe('List of active editor windows'),
} satisfies CommandDefinition
