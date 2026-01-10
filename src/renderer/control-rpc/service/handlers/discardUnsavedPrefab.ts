import type { discardUnsavedPrefabCommand } from '@tekton/control-rpc-contract/commands/discardUnsavedPrefab'

import type { CommandHandler } from '../types'

import { state, subscribe } from '../../../state/State'
import { ControlOperationalError } from '../../control-errors'
import { ERR_DISCARD_UNSAVED_PREFAB_FAILED } from '../../jsonrpc-errors'

/**
 * @see {@link discardUnsavedPrefabCommand} for command definition
 */
export const discardUnsavedPrefab: CommandHandler<'discardUnsavedPrefab'> = (ctx) => async () => {
	const currentPrefab = state.canvas.currentPrefab
	if (!currentPrefab) {
		return { success: true }
	}

	const prefabAssetId = currentPrefab.id

	// Invalidate readiness markers before triggering reload
	state.canvas.mainSceneReadyPrefabAssetId = undefined
	state.canvas.mainSceneReadyAt = undefined

	ctx.appCommands.emit('discard-unsaved-prefab')

	try {
		await waitForDiscardComplete(prefabAssetId, { timeoutMs: 30_000 })
	} catch (error) {
		throw new ControlOperationalError({
			code: ERR_DISCARD_UNSAVED_PREFAB_FAILED,
			reason: 'discard_unsaved_prefab_failed',
			message: error instanceof Error ? error.message : String(error),
			details: { prefabAssetId },
		})
	}

	return { success: true }
}

function isDiscardComplete(prefabAssetId: string): boolean {
	return (
		state.canvas.mainSceneReadyPrefabAssetId === prefabAssetId &&
		state.canvas.mainSceneReadyAt !== undefined &&
		state.canvas.hasUnsavedChanges === false
	)
}

async function waitForDiscardComplete(prefabAssetId: string, options: { timeoutMs: number }): Promise<void> {
	if (isDiscardComplete(prefabAssetId)) {
		return
	}

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), options.timeoutMs)

	try {
		await new Promise<void>((resolve, reject) => {
			let didFinish = false

			const finish = (err?: Error) => {
				if (didFinish) {
					return
				}
				didFinish = true
				clearTimeout(timeout)
				controller.abort()
				if (err) {
					reject(err)
				} else {
					resolve()
				}
			}

			if (isDiscardComplete(prefabAssetId)) {
				finish()
				return
			}

			subscribe(
				state.canvas,
				() => {
					if (isDiscardComplete(prefabAssetId)) {
						finish()
					}
				},
				{ signal: controller.signal },
			)

			controller.signal.addEventListener(
				'abort',
				() => {
					if (didFinish) {
						return
					}
					finish(new Error(`discardUnsavedPrefab timed out waiting for scene reload (${options.timeoutMs}ms)`))
				},
				{ once: true },
			)
		})
	} finally {
		clearTimeout(timeout)
		controller.abort()
	}
}
