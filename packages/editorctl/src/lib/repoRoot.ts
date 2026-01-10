import fs from 'node:fs'
import path from 'node:path'

/**
 * Finds the nearest parent directory containing a `package.json` file.
 *
 * This mirrors the behavior of `@tekton/editorctl-client` for determining
 * the "repo root" for worktree targeting.
 *
 * @param startDir - The directory to start searching from.
 * @returns The resolved path to the nearest repo root, or the starting directory if not found.
 */
export async function findNearestRepoRoot(startDir: string): Promise<string> {
	let dir = startDir

	// Normalize once up front for consistent traversal.
	try {
		dir = await fs.promises.realpath(dir)
	} catch {
		dir = path.resolve(dir)
	}

	while (true) {
		const candidate = path.join(dir, 'package.json')
		if (await fileExists(candidate)) {
			return dir
		}

		const parent = path.dirname(dir)
		if (parent === dir) {
			// Not a repo checkout; best-effort fallback to the resolved starting directory.
			return dir
		}
		dir = parent
	}
}

/**
 * Normalizes a path by resolving symlinks (realpath) and making it absolute.
 *
 * Falls back to `path.resolve` if the path doesn't exist on disk.
 */
export async function normalizePath(p: string): Promise<string> {
	try {
		return await fs.promises.realpath(p)
	} catch {
		return path.resolve(p)
	}
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.promises.access(filePath, fs.constants.F_OK)
		return true
	} catch {
		return false
	}
}
