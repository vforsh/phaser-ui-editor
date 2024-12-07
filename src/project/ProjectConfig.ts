import { minimatch } from 'minimatch'
import { ReadonlyDeep } from 'type-fest'
import { z } from 'zod'

export const projectConfigSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1).optional(),
	l10n: z.string().endsWith('.json').optional(),
	texturePacker: z.object({
		// TODO check if the path is absolute
		path: z.string().min(1),
		// mapping between spritesheets and .tps files (TexturePacker project files)
		mapping: z.object({}).optional(),
	}),
	assetsDir: z.string().refine(isValidRelativeFilePath, {
		message: 'Invalid relative file path',
	}),
	assetsIgnore: z.array(
		z.string().refine(isValidMinimatchPattern, {
			message: 'Invalid minimatch pattern',
		})
	),
	size: z.object({
		width: z.number().int().positive(),
		height: z.number().int().positive(),
	}),
})

function isValidRelativeFilePath(path: string): boolean {
	const relativePathPattern = /^(?!\/|[a-zA-Z]:\\|[a-zA-Z]:\/)(?!.*[<>:"|?*]).*$/
	return relativePathPattern.test(path)
}

function isValidMinimatchPattern(pattern: string): boolean {
	try {
		const result = minimatch.makeRe(pattern)
		if (result === false) {
			return false
		}

		return true
	} catch {
		return false
	}
}

export type ProjectConfig = ReadonlyDeep<z.infer<typeof projectConfigSchema>>