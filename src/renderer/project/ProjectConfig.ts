import { ReadonlyDeep } from 'type-fest'
import { z } from 'zod'

import { absolutePathSchema, minimatchPatternSchema, relativePathSchema } from '../state/Schemas'

export const projectConfigSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1).optional(),
	l10n: z.string().endsWith('.json').optional(),
	texturePacker: z.object({
		path: absolutePathSchema,
		// mapping between spritesheets and .tps files (TexturePacker project files)
		mapping: z.object({}).optional(),
	}),
	assetsDir: relativePathSchema,
	assetsIgnore: z.array(minimatchPatternSchema),
	size: z.object({
		width: z.number().int().positive(),
		height: z.number().int().positive(),
	}),
})

export type ProjectConfig = ReadonlyDeep<z.infer<typeof projectConfigSchema>>
