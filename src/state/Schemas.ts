import { minimatch } from 'minimatch'
import path from 'path-browserify-esm'
import { z } from 'zod'

export const absolutePathSchema = z
	.string()
	.min(1)
	.refine((value) => path.isAbsolute(value), 'must be an absolute path')

export const relativePathSchema = z
	.string()
	.min(1)
	.refine((value) => !path.isAbsolute(value), 'must be a relative path')

export const minimatchPatternSchema = z
	.string()
	.min(1)
	.refine((value) => {
		const result = minimatch.makeRe(value)
		if (result === false) {
			return false
		}

		return true
	}, 'must be a valid minimatch pattern')
