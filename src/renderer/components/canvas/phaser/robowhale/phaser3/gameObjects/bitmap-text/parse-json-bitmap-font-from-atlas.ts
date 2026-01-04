import { parseJsonBitmapFont } from './parse-json-bitmap-font'

/**
 * Parse an JSON Bitmap Font from an Atlas.
 *
 * Adds the parsed Bitmap Font data to the cache with the `fontName` key.
 *
 * @param {Phaser.Scene} scene - The Scene to parse the Bitmap Font for.
 * @param {string} fontName - The key of the font to add to the Bitmap Font cache.
 * @param {string} textureKey - The key of the BitmapFont's texture.
 * @param {string} frameKey - The key of the BitmapFont texture's frame.
 * @param {string} jsonKey - The key of the json data of the font to parse.
 *
 * @return {boolean} Whether the parsing was successful or not.
 */
export function parseJsonBitmapFontFromAtlas(
	scene: Phaser.Scene,
	fontName: string,
	textureKey: string,
	frameKey: string,
	jsonKey: string
): boolean {
	let texture = scene.sys.textures.get(textureKey)
	let frame = texture.get(frameKey)
	let json = scene.sys.cache.json.get(jsonKey)

	if (!frame || !json) {
		return false
	}

	let data = parseJsonBitmapFont(json, frame, texture)

	scene.sys.cache.bitmapFont.add(fontName, { data: data, texture: textureKey, frame: frameKey, fromAtlas: true })

	return true
}
