import type { waitForCanvasIdleCommand } from '@tekton/control-rpc-contract/commands/waitForCanvasIdle'

import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { getAssetById, isAssetOfType } from '../../../types/assets'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function hasPhaserApp(): boolean {
	return Boolean((window as any).__canvasPhaserAppForHmr)
}

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

	// Fail fast: waiting for canvas idle only makes sense when the Phaser canvas is running.
	if (!hasPhaserApp()) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'canvas is not initialized (PhaserApp is not running)' },
		}
	}

	// Fail fast: if no prefab is open *and* we have no valid "prefab being opened" target for this project,
	// waiting would just burn the timeout.
	if (!state.canvas.currentPrefab?.id) {
		const lastOpenedId = state.canvas.lastOpenedPrefabAssetId
		const lastOpenedAsset = lastOpenedId ? getAssetById(state.assets.items, lastOpenedId) : undefined
		const isValidPrefabTarget = Boolean(lastOpenedAsset && isAssetOfType(lastOpenedAsset, 'prefab'))

		if (!isValidPrefabTarget) {
			return {
				ok: false,
				error: { kind: 'validation', message: 'no prefab is open (call openPrefab first)' },
			}
		}
	}

	const timeoutMs = params.timeoutMs ?? 10_000
	const pollMs = params.pollMs ?? 50
	const start = Date.now()

	let stableTicks = 0
	let lastCanvasSelection = state.canvas.selectionChangedAt
	let lastAssetsSelection = state.assets.selectionChangedAt

	while (Date.now() - start < timeoutMs) {
		if (!hasPhaserApp()) {
			return {
				ok: false,
				error: { kind: 'validation', message: 'canvas is not initialized (PhaserApp is not running)' },
			}
		}

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
