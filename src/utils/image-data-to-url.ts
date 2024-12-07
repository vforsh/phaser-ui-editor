/**
 * Converts an array of image data (e.g. `Buffer` from `fs.readFile()`) to a URL
 */
export function imageDataToUrl(imageData: number[], type = 'image/png'): string {
	const blob = new Blob([new Uint8Array(imageData)], { type })
	const url = URL.createObjectURL(blob)
	return url
}
