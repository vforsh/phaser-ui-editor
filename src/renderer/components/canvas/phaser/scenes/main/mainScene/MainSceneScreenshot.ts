import { mainApi } from '@main-api/main-api'
import { state } from '@state/State'

import { MainSceneDeps } from './mainSceneTypes'
import { formatScreenshotTimestamp, getPrefabBaseName, sanitizeFileNamePart } from './mainSceneUtils'

export type ScreenshotOptions = {
	/** If true, hides editor overlays (selection, grid, etc.) before taking the screenshot */
	clean?: boolean
	/** Output image format. Defaults to 'png' */
	format?: 'png' | 'jpg' | 'webp'
}

export class MainSceneScreenshot {
	constructor(private deps: MainSceneDeps) {}

	/**
	 * Takes a screenshot of the canvas and saves it to the local filesystem.
	 *
	 * @param options - Screenshot configuration
	 * @returns The absolute path to the saved screenshot file
	 */
	public async take(options?: ScreenshotOptions): Promise<string> {
		const prefabName = this.getPrefabNameForScreenshot()
		const timestamp = formatScreenshotTimestamp(new Date())
		const format = options?.format ?? 'png'
		const fileBase = sanitizeFileNamePart(`${timestamp}--${prefabName}`)
		const fileName = `${fileBase}.${format}`

		const targetDir = '/Users/vlad/dev/phaser-ui-editor/screenshots'

		const capture = async () => {
			const blob = await this.getRendererSnapshot(format)
			const arrayBuffer = await blob.arrayBuffer()
			const bytes = new Uint8Array(arrayBuffer)

			const result = await mainApi.saveScreenshot({
				targetDir,
				fileName,
				bytes,
			})

			this.deps.logger.info(`saved canvas screenshot at ${result.path}`)
			return result.path
		}

		if (!options?.clean) {
			return await capture()
		}

		const context = this.deps.editContexts.current
		if (!context) {
			return await capture()
		}

		return await context.withEditorOverlaysHidden(capture)
	}

	/**
	 * Captures a raw snapshot from the Phaser renderer.
	 */
	private getRendererSnapshot(format: ScreenshotOptions['format'] = 'png', quality = 1): Promise<Blob> {
		const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
		const renderer = this.deps.scene.renderer

		return new Promise<Blob>((resolve, reject) => {
			renderer.snapshot(
				(snapshot) => {
					if (!(snapshot instanceof HTMLImageElement)) {
						reject(new Error('Failed to capture renderer snapshot: invalid snapshot type'))
						return
					}

					void (async () => {
						try {
							const res = await fetch(snapshot.src)
							const blob = await res.blob()
							resolve(blob)
						} catch (error) {
							reject(error instanceof Error ? error : new Error(String(error)))
						}
					})()
				},
				mime as unknown as 'image/png',
				quality,
			)
		})
	}

	private getPrefabNameForScreenshot(): string {
		const rawName = state.canvas.currentPrefab?.name
		if (!rawName) {
			return 'no-prefab'
		}

		const base = getPrefabBaseName(rawName)
		if (!base) {
			return 'no-prefab'
		}

		return base
	}
}
