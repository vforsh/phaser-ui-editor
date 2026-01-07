import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'

export const projectConfigSchema = z
	.object({
		name: z.string().min(1).describe('Name of the project'),
		slug: z.string().min(1).optional().describe('URL-friendly slug for the project'),
		l10n: z.string().endsWith('.json').optional().describe('Path to the localization JSON file'),
		texturePacker: z
			.object({
				path: z.string().min(1).describe('Path to the TexturePacker executable or project'),
				mapping: z.record(z.string()).optional().describe('Mapping of texture names to paths'),
			})
			.strict()
			.describe('TexturePacker configuration'),
		assetsDir: z.string().min(1).describe('Directory containing project assets'),
		assetsIgnore: z.array(z.string()).describe('Patterns of assets to ignore'),
		size: z
			.object({
				width: z.number().int().positive().describe('Default canvas width'),
				height: z.number().int().positive().describe('Default canvas height'),
			})
			.strict()
			.describe('Default project dimensions'),
	})
	.strict()
	.describe('Project configuration settings')

export type ProjectConfig = z.infer<typeof projectConfigSchema>

export const getProjectInfoCommand = {
	group: 'misc',
	description: 'Retrieves information about the currently open project.',
	input: z.object({}).strict().describe('Input parameters for getting project info (empty)'),
	output: projectConfigSchema
		.extend({
			path: z.string().min(1).describe('Absolute file system path to the project directory'),
		})
		.strict()
		.describe('Project configuration and current path'),
} satisfies CommandDefinition
