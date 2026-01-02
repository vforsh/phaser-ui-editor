type ImageDataLike = number[] | Uint8Array | ArrayBuffer

/**
 * Converts image bytes (Buffer/Uint8Array/ArrayBuffer/number[]) to a URL.
 */
export function imageDataToUrl(imageData: ImageDataLike, type = 'image/png'): string {
	const bytes = imageData instanceof Uint8Array ? imageData : new Uint8Array(imageData)
	const blob = new Blob([bytes], { type })
	const url = URL.createObjectURL(blob)
	return url
}
