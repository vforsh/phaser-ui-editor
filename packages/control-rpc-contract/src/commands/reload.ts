import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { successSchema } from '../shared-schemas.js'

export const reloadCommand = {
	group: 'misc',
	kind: 'write',
	description: 'Reloads the renderer unconditionally; unsaved changes will be lost.',
	input: z.object({
		force: z.boolean().optional().describe('If true, reloads ignoring the HTTP/browser cache (menu "Force Reload" equivalent).'),
	}),
	output: successSchema,
} satisfies CommandDefinition
