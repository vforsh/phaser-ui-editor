/**
 * Launcher for the Phaser UI Editor (Electron + Vite) in development mode.
 *
 * Why this exists:
 * - When you stop a VS Code task, the spawned Electron app can remain running as an orphan.
 * - Relying on `pkill -f out/main/main.js` is not reliable in dev because Electron's command
 *   line often doesn't include that file.
 *
 * How it works:
 * - Spawns the dev command (prefer `node_modules/.bin/electron-vite dev`).
 * - Writes a pidfile in OS temp dir with the root PID/PGID, so we can later kill the exact
 *   process tree we started (even if the command line doesn't contain the workspace path).
 * - On shutdown (signals + exit), it kills:
 *   1) the whole process group (POSIX) and
 *   2) the full process tree (via `pgrep -P` recursion)
 *   and finally does a best-effort `pkill` fallback.
 *
 * Exit handling is wired via `exit-hook`.
 * Ref: https://github.com/sindresorhus/exit-hook
 */

import exitHook from 'exit-hook'
import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const isWin = process.platform === 'win32'
const appMainPath = `${process.cwd()}/out/main/main.js`

let cleanedUp = false
let child = null

function getPidFilePath() {
	const hash = crypto.createHash('sha1').update(process.cwd()).digest('hex').slice(0, 10)
	return path.join(os.tmpdir(), `phaser-ui-editor-dev-${hash}.pid.json`)
}

function safeUnlink(filePath) {
	try {
		fs.unlinkSync(filePath)
	} catch {
		// ignore
	}
}

function readPidFile() {
	const pidFilePath = getPidFilePath()
	if (!fs.existsSync(pidFilePath)) return null

	try {
		const raw = fs.readFileSync(pidFilePath, 'utf8')
		const data = JSON.parse(raw)
		if (!data || typeof data !== 'object') return null

		const rootPid = typeof data.rootPid === 'number' ? data.rootPid : null
		const rootPgid = typeof data.rootPgid === 'number' ? data.rootPgid : null

		if (!rootPid) return null

		return { pidFilePath, rootPid, rootPgid }
	} catch {
		return null
	}
}

function writePidFile(rootPid, rootPgid) {
	const pidFilePath = getPidFilePath()
	const payload = {
		rootPid,
		rootPgid,
		cwd: process.cwd(),
		createdAt: new Date().toISOString(),
	}

	try {
		fs.writeFileSync(pidFilePath, JSON.stringify(payload, null, 2), 'utf8')
	} catch {
		// ignore
	}

	return pidFilePath
}

function pkillElectronApp() {
	// Best-effort; this repo already uses pkill in VS Code tasks.
	if (isWin) return
	spawnSync('pkill', ['-f', appMainPath], { stdio: 'ignore' })
}

function killProcessTree(rootPid, signal) {
	if (isWin) {
		try {
			process.kill(rootPid, signal)
		} catch {
			// ignore
		}
		return
	}

	const visited = new Set()
	const stack = [rootPid]
	const killOrder = []

	while (stack.length > 0) {
		const pid = stack.pop()
		if (!pid) continue
		if (visited.has(pid)) continue
		visited.add(pid)
		killOrder.push(pid)

		const result = spawnSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' })
		const output = (result.stdout ?? '').trim()
		if (!output) continue

		for (const line of output.split(/\s+/)) {
			const childPid = Number(line)
			if (!Number.isFinite(childPid)) continue
			stack.push(childPid)
		}
	}

	// Children first, then root.
	for (const pid of killOrder.reverse()) {
		try {
			process.kill(pid, signal)
		} catch {
			// ignore
		}
	}
}

function tryKillProcessGroup(pgid, signal) {
	if (isWin) return false
	if (typeof pgid !== 'number') return false

	try {
		// Negative PID => kill the whole process group (POSIX).
		process.kill(-pgid, signal)
		return true
	} catch {
		return false
	}
}

function tryStopChild(signal = 'SIGTERM') {
	if (!child) return
	if (child.exitCode !== null) return
	if (typeof child.pid !== 'number') return

	// Prefer killing the process group (if we started it detached).
	if (tryKillProcessGroup(child.pid, signal)) return

	// Fallback: kill just the root process.
	try {
		child.kill(signal)
	} catch {
		// ignore
	}
}

function cleanup() {
	if (cleanedUp) return
	cleanedUp = true

	tryStopChild('SIGTERM')

	// Also kill by pidfile (covers cases where child pointer is already gone).
	const pidFile = readPidFile()
	if (pidFile) {
		if (pidFile.rootPgid) tryKillProcessGroup(pidFile.rootPgid, 'SIGTERM')
		killProcessTree(pidFile.rootPid, 'SIGTERM')

		// Escalate.
		if (pidFile.rootPgid) tryKillProcessGroup(pidFile.rootPgid, 'SIGKILL')
		killProcessTree(pidFile.rootPid, 'SIGKILL')

		safeUnlink(pidFile.pidFilePath)
	}

	// Last resort fallback (may or may not match in dev).
	pkillElectronApp()
}

function cleanupAndExit(exitCode = 0) {
	cleanup()
	process.exit(exitCode)
}

exitHook(() => {
	cleanup()
})

// These handlers make sure we exit with a non-zero code while still cleaning up.
process.on('uncaughtException', (error) => {
	console.error(error)
	cleanupAndExit(1)
})

process.on('unhandledRejection', (error) => {
	console.error(error)
	cleanupAndExit(1)
})

// If VS Code stops the task, it typically sends SIGTERM; handle explicitly so we
// can also try to stop the child process group before the process exits.
process.on('SIGINT', () => cleanupAndExit(0))
process.on('SIGTERM', () => cleanupAndExit(0))
process.on('SIGHUP', () => cleanupAndExit(0))

function getDevCommand() {
	if (isWin) {
		const cmd = path.resolve(process.cwd(), 'node_modules', '.bin', 'electron-vite.cmd')
		return { cmd, args: ['dev'] }
	}

	const cmd = path.resolve(process.cwd(), 'node_modules', '.bin', 'electron-vite')
	return { cmd, args: ['dev'] }
}

// Start from a clean state: if a previous run left a pidfile, kill that exact tree first.
const previous = readPidFile()
if (previous) {
	if (previous.rootPgid) tryKillProcessGroup(previous.rootPgid, 'SIGTERM')
	killProcessTree(previous.rootPid, 'SIGTERM')
	if (previous.rootPgid) tryKillProcessGroup(previous.rootPgid, 'SIGKILL')
	killProcessTree(previous.rootPid, 'SIGKILL')
	safeUnlink(previous.pidFilePath)
}

const { cmd, args } = getDevCommand()

child = spawn(cmd, args, {
	stdio: 'inherit',
	shell: false,
	windowsHide: true,
	detached: !isWin,
})

if (typeof child.pid === 'number') {
	// In detached mode (POSIX), PID is also the process group ID.
	writePidFile(child.pid, !isWin ? child.pid : null)
}

child.on('exit', (code, signal) => {
	// If the child exits on its own, still ensure Electron is cleaned up.
	pkillElectronApp()

	if (typeof code === 'number') {
		process.exit(code)
	}

	// If killed by a signal, treat it as a clean shutdown.
	if (signal) {
		process.exit(0)
	}

	process.exit(0)
})
