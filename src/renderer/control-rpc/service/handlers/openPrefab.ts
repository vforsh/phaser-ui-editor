import type { ControlMethod } from '@tekton/control-rpc-contract'
import type { openPrefabCommand } from '@tekton/control-rpc-contract/commands/openPrefab'

import { P, match } from 'ts-pattern'

import type { CommandHandler } from '../types'

import { state, subscribe } from '../../../state/State'
import { ControlOperationalError } from '../../control-errors'
import { ERR_UNSAVED_PREFAB_CHANGES } from '../../jsonrpc-errors'
import { findAssetByPath } from '../utils/assets'

/**
 * @see {@link openPrefabCommand} for command definition
 */
export const openPrefab: CommandHandler<'openPrefab'> = (ctx) => async (params) => {
	const assetId = match(params)
		.with({ assetId: P.string }, ({ assetId }) => assetId)
		.with({ path: P.string }, ({ path }) => resolvePrefabIdByPath(path))
		.exhaustive()

	if (!assetId) {
		throw new Error('openPrefab requires assetId or a valid prefab path')
	}

	// Guard clause: if the currently opened prefab has unsaved changes, block opening a different prefab.
	if (state.canvas.hasUnsavedChanges && state.canvas.currentPrefab?.id && state.canvas.currentPrefab.id !== assetId) {
		const cmdSavePrefab: ControlMethod = 'savePrefab'
		const cmdDiscardUnsavedPrefab: ControlMethod = 'discardUnsavedPrefab'
		const cmdOpenPrefab: ControlMethod = 'openPrefab'

		throw new ControlOperationalError({
			code: ERR_UNSAVED_PREFAB_CHANGES,
			reason: 'unsaved_prefab_changes',
			message: `Unsaved prefab changes detected. Run \`${cmdSavePrefab}\` to save, or \`${cmdDiscardUnsavedPrefab}\` to discard, then retry \`${cmdOpenPrefab}\`.`,
			details: {
				currentPrefabAssetId: state.canvas.currentPrefab.id,
				requestedPrefabAssetId: assetId,
			},
		})
	}

	// Fast-path: if the requested prefab is already open and the scene has initialized,
	// PhaserApp will no-op and won't "re-open" it, so we must not wait.
	if (isMainSceneReadyForPrefab(assetId)) {
		return { success: true }
	}

	ctx.appCommands.emit('open-prefab', assetId)

	await waitForMainSceneReady(assetId, { timeoutMs: 30_000 })

	return { success: true }
}

function resolvePrefabIdByPath(prefabPath: string): string | undefined {
	if (!state.projectDir) {
		return undefined
	}

	const asset = findAssetByPath(state.assets.items, prefabPath, state.projectDir)
	if (!asset || asset.type !== 'prefab') {
		return undefined
	}

	return asset.id
}

function isMainSceneReadyForPrefab(prefabAssetId: string): boolean {
	return (
		state.canvas.currentPrefab?.id === prefabAssetId &&
		state.canvas.root !== null &&
		state.canvas.mainSceneReadyPrefabAssetId === prefabAssetId
	)
}

async function waitForMainSceneReady(prefabAssetId: string, options: { timeoutMs: number }): Promise<void> {
	if (isMainSceneReadyForPrefab(prefabAssetId)) {
		return
	}

	const controller = new AbortController()

	const timeout = setTimeout(() => {
		controller.abort()
	}, options.timeoutMs)

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

			// Re-check after wiring up, in case we raced a state change.
			if (isMainSceneReadyForPrefab(prefabAssetId)) {
				finish()
				return
			}

			subscribe(
				state.canvas,
				() => {
					if (!isMainSceneReadyForPrefab(prefabAssetId)) {
						return
					}
					finish()
				},
				{ signal: controller.signal },
			)

			controller.signal.addEventListener(
				'abort',
				() => {
					if (didFinish) {
						return
					}
					finish(new Error(`openPrefab timed out waiting for MainScene.create() (${options.timeoutMs}ms)`))
				},
				{ once: true },
			)
		})
	} finally {
		clearTimeout(timeout)
		controller.abort()
	}
}
