import { dialog, shell } from 'electron'
import { Font, FontCollection, create } from 'fontkit'
import fse from 'fs-extra'
import { globby } from 'globby'
import sizeOf from 'image-size'
import path from 'node:path'
import open from 'open'
import parseBmfontXml from 'parse-bmfont-xml'
import sharp from 'sharp'
import trash from 'trash'
import type { TexturePacker } from '../../../types/texture-packer'
import type { BackendApi } from '../../backend-contract/types'
import { normalizeAbsolutePath } from '../utils/path'

export const backendHandlers: BackendApi = {
	async globby({ patterns, options }) {
		return globby(patterns, options)
	},
	async exists({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		return fse.pathExists(normalized)
	},
	async stat({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		const stats = await fse.stat(normalized)
		return {
			size: stats.size,
			isFile: stats.isFile(),
			isDirectory: stats.isDirectory(),
			isSymbolicLink: stats.isSymbolicLink(),
		}
	},
	async open({ path: targetPath, options }) {
		const normalized = normalizeAbsolutePath(targetPath)
		await open(normalized, options ?? {})
		return { success: true }
	},
	async remove({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		await fse.remove(normalized)
		return { success: true }
	},
	async createFolder({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		await fse.ensureDir(normalized)
		return { success: true }
	},
	async createFile({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		await fse.ensureFile(normalized)
		return { success: true }
	},
	async createTextFile({ path: targetPath, content }) {
		const normalized = normalizeAbsolutePath(targetPath)
		await fse.writeFile(normalized, content)
		return { success: true }
	},
	async trash({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		await trash(normalized)
		return { success: true }
	},
	async rename({ oldPath, newPath }) {
		const normalizedOldPath = normalizeAbsolutePath(oldPath)
		const normalizedNewPath = normalizeAbsolutePath(newPath)
		await fse.rename(normalizedOldPath, normalizedNewPath)
		return { success: true }
	},
	async readImageSize({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		const file = await fse.readFile(normalized)
		const imageInfo = sizeOf(file)
		return {
			width: imageInfo.width ?? 0,
			height: imageInfo.height ?? 0,
		}
	},
	async readFile({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		const file = await fse.readFile(normalized)
		return { bytes: new Uint8Array(file) }
	},
	async readJson({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		return fse.readJson(normalized)
	},
	async readBmfontXml({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		const xml = await fse.readFile(normalized, 'utf-8')
		return parseBmfontXml(xml)
	},
	async readText({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		const text = await fse.readFile(normalized, 'utf-8')
		return { content: text }
	},
	async readSpritesheetFrame({ spritesheetPath, frameName }) {
		const normalizedSpritesheetPath = normalizeAbsolutePath(spritesheetPath)
		const jsonPath = normalizedSpritesheetPath.replace(path.extname(normalizedSpritesheetPath), '.json')
		const json = (await fse.readJson(jsonPath)) as TexturePacker.Atlas
		const texture = json.textures.find((texture) => texture.frames.find((frame) => frame.filename === frameName))
		const frameData = texture?.frames.find((frame) => frame.filename === frameName)

		if (!frameData) {
			throw new Error(`Frame '${frameName}' not found in spritesheet '${spritesheetPath}'`)
		}

		const frame = await extractFrameFromSpritesheet(normalizedSpritesheetPath, frameData)

		return { bytes: new Uint8Array(frame) }
	},
	async writeJson({ path: targetPath, content, options }) {
		const normalized = normalizeAbsolutePath(targetPath)
		await fse.writeJson(normalized, content, options)
		return { path: normalized }
	},
	async duplicate({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		const isDirectory = fse.statSync(normalized).isDirectory()
		if (isDirectory) {
			const newPath = normalized + '-copy'
			fse.ensureDirSync(newPath)
			fse.copySync(normalized, newPath)
			return { path: newPath }
		}

		const ext = path.extname(normalized)
		const newPath = normalized.replace(ext, `-copy${ext}`)
		fse.copyFileSync(normalized, newPath)
		return { path: newPath }
	},
	async parseWebFont({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		const fontBuffer = await fse.readFile(normalized)
		const fontOrCollection = create(fontBuffer)

		if (isFontCollection(fontOrCollection)) {
			throw new Error('Font collection is not supported')
		}

		const font = fontOrCollection as Font
		const base64 = fontBuffer.toString('base64')

		return {
			base64,
			type: font.type,
			postscriptName: font.postscriptName,
			fullName: font.fullName,
			familyName: font.familyName,
			subfamilyName: font.subfamilyName,
			version: font.version.toString(),
			numGlyphs: font.numGlyphs,
			unitsPerEm: font.unitsPerEm,
			bbox: font.bbox,
			ascent: font.ascent,
			descent: font.descent,
			lineGap: font.lineGap,
			capHeight: font.capHeight,
			xHeight: font.xHeight,
			italicAngle: font.italicAngle,
			underlinePosition: font.underlinePosition,
			underlineThickness: font.underlineThickness,
			availableFeatures: font.availableFeatures,
			characterSet: font.characterSet,
		}
	},
	async selectDirectory(options) {
		const result = await dialog.showOpenDialog({
			title: options?.title,
			defaultPath: options?.defaultPath,
			properties: ['openDirectory'],
		})

		return {
			canceled: result.canceled,
			path: result.canceled ? null : (result.filePaths[0] ?? null),
		}
	},
	async selectFile(options) {
		const result = await dialog.showOpenDialog({
			title: options?.title,
			defaultPath: options?.defaultPath,
			filters: options?.filters,
			properties: ['openFile'],
		})

		return {
			canceled: result.canceled,
			path: result.canceled ? null : (result.filePaths[0] ?? null),
		}
	},
	async saveFileDialog(options) {
		const result = await dialog.showSaveDialog({
			title: options?.title,
			defaultPath: options?.defaultPath,
			filters: options?.filters,
		})

		return {
			canceled: result.canceled,
			path: result.canceled ? null : (result.filePath ?? null),
		}
	},
	async saveScreenshot({ targetDir, fileName, bytes }) {
		const normalizedDir = normalizeAbsolutePath(targetDir)
		await fse.ensureDir(normalizedDir)

		const outPath = path.join(normalizedDir, fileName)
		await fse.writeFile(outPath, Buffer.from(bytes))

		return { path: outPath }
	},
	async showItemInFolder({ path: targetPath }) {
		const normalized = normalizeAbsolutePath(targetPath)
		shell.showItemInFolder(normalized)
		return { success: true }
	},
}

function isFontCollection(font: Font | FontCollection): font is FontCollection {
	return font.type === 'TTC' || font.type === 'DFont'
}

async function extractFrameFromSpritesheet(spritesheetPath: string, frameData: TexturePacker.Frame): Promise<Buffer> {
	const image = sharp(spritesheetPath)

	const frame = image.extract({
		left: frameData.frame.x,
		top: frameData.frame.y,
		width: frameData.frame.w,
		height: frameData.frame.h,
	})

	return frame.toBuffer()
}
