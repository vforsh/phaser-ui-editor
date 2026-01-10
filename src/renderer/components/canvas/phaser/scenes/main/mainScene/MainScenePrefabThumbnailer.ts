import { mainApi } from '@main-api/main-api'
import { state } from '@state/State'

import { getPrefabThumbnailAbsPath, getPrefabThumbnailsDir } from '../../../../../../types/assets'
import { getEditableWorldBounds } from '../editContext/object-bounds'
import { MainSceneDeps } from './mainSceneTypes'

export type ThumbnailCaptureOptions = {
	/** Padding in pixels around the prefab bounds. Defaults to 0. */
	padding?: number
	/** Output image format. Defaults to 'png'. */
	format?: 'png' | 'jpg' | 'webp'
}

/**
 * Handles thumbnail generation for prefab saves.
 * Renders only the prefab root container to a RenderTexture for a clean thumbnail.
 */
export class MainScenePrefabThumbnailer {
	/** Reusable rectangle to avoid allocations during bounds computation. */
	private readonly boundsRect = new Phaser.Geom.Rectangle()

	/** Tracks if a capture is currently in progress for this prefab. */
	private isCaptureInProgress = false

	constructor(private deps: MainSceneDeps) {}

	/**
	 * Captures and writes a thumbnail for the currently open prefab.
	 * This method is designed to be called fire-and-forget after a successful save.
	 *
	 * @returns Promise that resolves when the thumbnail is written (or fails silently)
	 */
	public async captureAndWriteCurrentPrefabThumbnail(options?: ThumbnailCaptureOptions): Promise<void> {
		if (this.isCaptureInProgress) {
			this.deps.logger.debug('[prefab-thumbnail] skipping capture - already in progress')
			return
		}

		const prefabAsset = this.deps.sceneInitData.prefabAsset
		const thumbnailPath = getPrefabThumbnailAbsPath(prefabAsset)
		if (!thumbnailPath) {
			this.deps.logger.debug('[prefab-thumbnail] skipping - no project dir')
			return
		}

		this.isCaptureInProgress = true

		try {
			await this.ensureThumbnailsDirExists()
			const bytes = await this.captureRootToTexture(options)
			if (!bytes) {
				return
			}

			await this.writeThumbnail(thumbnailPath, bytes)
			this.deps.logger.debug(`[prefab-thumbnail] saved at ${thumbnailPath}`)
			state.assets.prefabThumbnailUpdatedAt[prefabAsset.id] = Date.now()
		} catch (error) {
			this.deps.logger.warn(`[prefab-thumbnail] failed (${error instanceof Error ? error.message : String(error)})`)
		} finally {
			this.isCaptureInProgress = false
		}
	}

	private async ensureThumbnailsDirExists(): Promise<void> {
		const thumbnailsDir = getPrefabThumbnailsDir()
		if (!thumbnailsDir) {
			return
		}

		const exists = await mainApi.exists({ path: thumbnailsDir })
		if (!exists) {
			await mainApi.createFolder({ path: thumbnailsDir })
		}
	}

	private async captureRootToTexture(options?: ThumbnailCaptureOptions): Promise<Uint8Array | null> {
		const root = this.deps.getRoot()
		const bounds = getEditableWorldBounds(root, this.boundsRect)

		if (!this.isValidBounds(bounds)) {
			this.deps.logger.debug('[prefab-thumbnail] skipping - invalid/empty bounds')
			return null
		}

		const padding = options?.padding ?? 0

		// Calculate texture size with padding
		const contentWidth = bounds.width + padding * 2
		const contentHeight = bounds.height + padding * 2
		const textureWidth = Math.ceil(contentWidth)
		const textureHeight = Math.ceil(contentHeight)

		// Create a temporary RenderTexture
		const rt = this.deps.scene.make.renderTexture({ width: textureWidth, height: textureHeight }, false)

		try {
			// Calculate draw position: offset root so its bounds start at (padding, padding) in the texture
			const drawX = padding - bounds.x
			const drawY = padding - bounds.y

			// Draw the root container (and all its children) to the RenderTexture
			rt.draw(root, drawX, drawY)

			// Snapshot the RenderTexture
			const blob = await this.snapshotRenderTexture(rt, options?.format ?? 'png')
			const arrayBuffer = await blob.arrayBuffer()
			return new Uint8Array(arrayBuffer)
		} finally {
			rt.destroy()
		}
	}

	private snapshotRenderTexture(rt: Phaser.GameObjects.RenderTexture, format: 'png' | 'jpg' | 'webp'): Promise<Blob> {
		const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'

		return new Promise<Blob>((resolve, reject) => {
			rt.snapshot((snapshot) => {
				if (!(snapshot instanceof HTMLImageElement)) {
					reject(new Error('Failed to capture RenderTexture snapshot: invalid snapshot type'))
					return
				}

				try {
					// Convert data URL to blob directly (avoids CSP issues with fetch + data: URLs)
					const dataUrl = snapshot.src
					const base64Index = dataUrl.indexOf(',')
					if (base64Index === -1) {
						reject(new Error('Invalid data URL format'))
						return
					}

					const base64Data = dataUrl.slice(base64Index + 1)
					const binaryString = atob(base64Data)
					const bytes = new Uint8Array(binaryString.length)
					for (let i = 0; i < binaryString.length; i++) {
						bytes[i] = binaryString.charCodeAt(i)
					}

					const blob = new Blob([bytes], { type: mime })
					resolve(blob)
				} catch (error) {
					reject(error instanceof Error ? error : new Error(String(error)))
				}
			}, mime)
		})
	}

	private isValidBounds(bounds: Phaser.Geom.Rectangle): boolean {
		return (
			Number.isFinite(bounds.width) &&
			Number.isFinite(bounds.height) &&
			bounds.width > 0 &&
			bounds.height > 0 &&
			Number.isFinite(bounds.centerX) &&
			Number.isFinite(bounds.centerY)
		)
	}

	private async writeThumbnail(thumbnailPath: string, bytes: Uint8Array): Promise<void> {
		if (!state.projectDir) {
			throw new Error('No project dir')
		}

		await mainApi.saveScreenshot({
			targetDir: getPrefabThumbnailsDir()!,
			fileName: thumbnailPath.split('/').pop()!,
			bytes: bytes as Uint8Array<ArrayBuffer>,
		})
	}
}
