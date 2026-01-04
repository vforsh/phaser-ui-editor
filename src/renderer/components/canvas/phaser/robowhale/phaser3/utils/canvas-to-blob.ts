type Format = 'image/png' | 'image/jpeg' | string

export function canvasToBlob(canvas: HTMLCanvasElement, type?: Format, quality?: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		try {
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob)
					} else {
						reject(new Error('Failed to create blob'))
					}
				},
				type,
				quality
			)
		} catch (error) {
			reject(error)
		}
	})
}
