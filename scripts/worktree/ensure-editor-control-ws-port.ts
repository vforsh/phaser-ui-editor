import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parseGitWorktreePorcelain, safeGitWorktreeListPorcelain } from './worktree-utils'

const EDITOR_CONTROL_WS_PORT = 'EDITOR_CONTROL_WS_PORT'
const BASE_PORT = 17870

/**
 * Best-effort helper for git worktrees:
 * - Read `.env` files across all worktrees (via `git worktree list --porcelain`).
 * - Ensure EDITOR_CONTROL_WS_PORT is unique across all worktrees, without probing the OS.
 * - Keep existing port if it doesn't conflict; only rewrite when missing/conflicting.
 *
 * This script is intentionally cross-platform and avoids shell/awk.
 */
function main() {
	const output = safeGitWorktreeListPorcelain()
	if (!output) {
		return
	}

	const worktrees = parseGitWorktreePorcelain(output)
		.map((e) => ({ worktree: e.worktree, branch: e.branch }))
		.filter((e) => typeof e.worktree === 'string')

	if (worktrees.length === 0) {
		return
	}

	const orderedWorktrees = orderWorktrees(worktrees)
	const usedPorts = new Set<number>()
	const changedWorktrees: string[] = []

	for (const entry of orderedWorktrees) {
		const envPath = resolve(entry.worktree, '.env')
		if (!existsSync(envPath)) {
			continue
		}

		const raw = readFileSync(envPath, { encoding: 'utf8' })
		const eol = raw.includes('\r\n') ? '\r\n' : '\n'
		const existingPort = readEnvPortNumber(raw, EDITOR_CONTROL_WS_PORT)

		if (typeof existingPort === 'number' && !usedPorts.has(existingPort)) {
			usedPorts.add(existingPort)
			continue
		}

		const nextPort = findNextFreePort({ usedPorts })
		let nextRaw = upsertEnvVar({
			raw,
			eol,
			key: EDITOR_CONTROL_WS_PORT,
			value: String(nextPort),
			anchorComment: '# The port used for the editor control WebSocket server (default: 17870).',
		})

		if (nextRaw !== raw) {
			writeFileSync(envPath, nextRaw, { encoding: 'utf8' })
			changedWorktrees.push(entry.worktree)
		}

		usedPorts.add(nextPort)
	}

	if (changedWorktrees.length > 0) {
		console.log(`[ensure-editor-control-ws-port] Updated ports in ${changedWorktrees.length} worktree(s).`)
	}
}

/**
 * @param {Array<{ worktree: string, branch?: string }>} entries
 */
function orderWorktrees(entries: Array<{ worktree: string; branch?: string }>) {
	const main: Array<{ worktree: string; branch?: string }> = []
	const others: Array<{ worktree: string; branch?: string }> = []

	for (const entry of entries) {
		if (entry.branch === 'refs/heads/master') {
			main.push(entry)
			continue
		}

		others.push(entry)
	}

	others.sort((a, b) => a.worktree.localeCompare(b.worktree))
	return [...main, ...others]
}

/**
 * @param {{ usedPorts: Set<number> }} options
 */
function findNextFreePort({ usedPorts }: { usedPorts: Set<number> }) {
	for (let port = BASE_PORT; port < 65536; port += 1) {
		if (!usedPorts.has(port)) {
			return port
		}
	}

	// Should be practically impossible; keep the script best-effort.
	return BASE_PORT
}

/**
 * @param {string} raw
 * @param {string} key
 */
function readEnvPortNumber(raw: string, key: string) {
	const re = new RegExp(`^${escapeRegExp(key)}=(\\d+)\\s*$`, 'm')
	const match = raw.match(re)
	if (!match) {
		return null
	}

	const parsed = Number.parseInt(match[1], 10)
	if (!Number.isFinite(parsed)) {
		return null
	}

	return parsed
}

/**
 * @param {{ raw: string, eol: string, key: string, value: string, anchorComment?: string }} options
 */
function upsertEnvVar({
	raw,
	eol,
	key,
	value,
	anchorComment,
}: {
	raw: string
	eol: string
	key: string
	value: string
	anchorComment?: string
}) {
	const lineRe = new RegExp(`^${escapeRegExp(key)}=.*$`, 'm')
	if (lineRe.test(raw)) {
		return raw.replace(lineRe, `${key}=${value}`)
	}

	if (typeof anchorComment === 'string') {
		const commentRe = new RegExp(`^${escapeRegExp(anchorComment)}\\s*$`, 'm')
		const match = raw.match(commentRe)
		if (match && typeof match.index === 'number') {
			const commentLineEnd = raw.indexOf(eol, match.index)
			if (commentLineEnd !== -1) {
				return raw.slice(0, commentLineEnd + eol.length) + `${key}=${value}${eol}` + raw.slice(commentLineEnd + eol.length)
			}
		}
	}

	let next = raw
	if (!next.endsWith(eol)) {
		next += eol
	}

	return `${next}${key}=${value}${eol}`
}

/**
 * @param {string} s
 */
function escapeRegExp(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

try {
	main()
} catch (error) {
	// Best-effort hook; don't block worktree creation.
	console.error(`ensure-editor-control-ws-port failed: ${String(error)}`)
}
