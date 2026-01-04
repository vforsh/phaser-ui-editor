import type { waitForCanvasIdleCommand } from '../../api/commands/waitForCanvasIdle'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @see {@link waitForCanvasIdleCommand} for command definition
 */
export const waitForCanvasIdle: CommandHandler<'waitForCanvasIdle'> = (_ctx) => async (params) => {
	if (!state.projectDir) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'no project is open' },
		}
	}

	const timeoutMs = params.timeoutMs ?? 10_000
	const pollMs = params.pollMs ?? 50
	const start = Date.now()

	let stableTicks = 0
	let lastCanvasSelection = state.canvas.selectionChangedAt
	let lastAssetsSelection = state.assets.selectionChangedAt

	while (Date.now() - start < timeoutMs) {
		const root = state.canvas.root
		if (!root) {
			stableTicks = 0
			await sleep(pollMs)
			continue
		}

		const canvasSelection = state.canvas.selectionChangedAt
		const assetsSelection = state.assets.selectionChangedAt
		const changed = canvasSelection !== lastCanvasSelection || assetsSelection !== lastAssetsSelection

		if (changed) {
			lastCanvasSelection = canvasSelection
			lastAssetsSelection = assetsSelection
			stableTicks = 0
		} else {
			stableTicks += 1
		}

		if (stableTicks >= 1) {
			return { ok: true }
		}

		await sleep(pollMs)
	}

	return {
		ok: false,
		error: { kind: 'timeout', message: `canvas did not become idle within ${timeoutMs}ms` },
	}
}
