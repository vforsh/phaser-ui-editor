import path from 'path-browserify-esm'

export function toProjectRelativePath(filePath: string, projectDir: string): string {
	if (!filePath) {
		return filePath
	}

	if (!path.isAbsolute(filePath)) {
		return filePath
	}

	if (!filePath.startsWith(projectDir)) {
		return filePath
	}

	return path.relative(projectDir, filePath)
}
