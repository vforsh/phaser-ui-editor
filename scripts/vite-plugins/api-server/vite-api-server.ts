import { initTRPC } from '@trpc/server'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import { Font, FontCollection, create } from 'fontkit'
import fse from 'fs-extra'
import { globby } from 'globby'
import sizeOf from 'image-size'
import open from 'open'
import path from 'path'
import sharp from 'sharp'
import trash from 'trash'
import { Plugin } from 'vite'
import xml2js from 'xml2js'
import { z } from 'zod'
// @ts-expect-error
import parseBmfontXml from 'parse-bmfont-xml'

const t = initTRPC.create()

const absPathSchema = z.string().refine((val) => path.isAbsolute(val), 'path should be absolute')

/**
 * https://github.com/sindresorhus/globby/tree/main?tab=readme-ov-file#options
 * https://github.com/mrmlnc/fast-glob#options-3
 */
const globbyOptionsSchema = z
	.object({
		cwd: z.string(),
		dot: z.boolean(),
		gitignore: z.boolean(),
		ignore: z.array(z.string()),
		expandDirectories: z.boolean(),
		onlyFiles: z.boolean(),
		onlyDirectories: z.boolean(),
		markDirectories: z.boolean(),
		objectMode: z.boolean(),
		stats: z.boolean(),
	})
	.partial()
	.optional()

const openOptionsSchema = z
	.object({
		app: z.object({
			name: z.string(),
			arguments: z.array(z.string()).optional(),
		}),
		wait: z.boolean(),
		background: z.boolean(),
		newInstance: z.boolean(),
		allowNonzeroExitCode: z.boolean(),
	})
	.partial()
	.optional()

const appRouter = t.router({
	globby: t.procedure
		.input(z.object({ patterns: z.array(z.string()), options: globbyOptionsSchema }))
		.query(async ({ input }) => {
			const { patterns, options } = input
			const result = await globby(patterns, options)
			return result
		}),
	exists: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const exists = await fse.exists(path)
		return exists
	}),
	stat: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const stats = await fse.stat(path)
		return {
			...stats,
			isFile: stats.isFile(),
			isDirectory: stats.isDirectory(),
			isSymbolicLink: stats.isSymbolicLink(),
		}
	}),
	statMany: t.procedure.input(z.array(absPathSchema)).query(async ({ input }) => {
		const stats = await Promise.all(input.map((path) => fse.stat(path)))
		return stats.map((stats) => ({
			...stats,
			isFile: stats.isFile(),
			isDirectory: stats.isDirectory(),
			isSymbolicLink: stats.isSymbolicLink(),
		}))
	}),
	open: t.procedure.input(z.object({ path: absPathSchema, options: openOptionsSchema })).query(async ({ input }) => {
		const { path, options } = input
		const cp = await open(path, options)
		return { success: true }
	}),
	remove: t.procedure.input(z.object({ path: absPathSchema })).mutation(async ({ input }) => {
		const { path } = input
		await fse.remove(path)
		return { success: true }
	}),
	createFolder: t.procedure.input(z.object({ path: absPathSchema })).mutation(async ({ input }) => {
		const { path } = input
		await fse.ensureDir(path)
		return { success: true }
	}),
	createFile: t.procedure.input(z.object({ path: absPathSchema })).mutation(async ({ input }) => {
		const { path } = input
		await fse.ensureFile(path)
		return { success: true }
	}),
	createTextFile: t.procedure
		.input(z.object({ path: absPathSchema, content: z.string() }))
		.mutation(async ({ input }) => {
			const { path, content } = input
			await fse.writeFile(path, content)
			return { success: true }
		}),
	trash: t.procedure.input(z.object({ path: absPathSchema })).mutation(async ({ input }) => {
		const { path } = input
		await trash(path)
		return { success: true }
	}),
	rename: t.procedure
		.input(z.object({ oldPath: absPathSchema, newPath: absPathSchema }))
		.mutation(async ({ input }) => {
			const { oldPath, newPath } = input
			// TODO check if newPath is a valid name
			await fse.rename(oldPath, newPath)
			return { success: true }
		}),
	readImageSize: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const file = await fse.readFile(path)
		const imageInfo = sizeOf(file)
		return { width: imageInfo.width, height: imageInfo.height }
	}),
	readFile: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const file = await fse.readFile(path)
		return file
	}),
	readJson: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const json = await fse.readJson(path)
		return json
	}),
	readXmlToJson: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const xml = await fse.readFile(path, 'utf-8')
		const json = await xml2js.parseStringPromise(xml)
		return json
	}),
	readBmfontXml: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const xml = await fse.readFile(path, 'utf-8')
		const json = await parseBmfontXml(xml)
		return json
	}),
	readText: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const text = await fse.readFile(path, 'utf-8')
		return { content: text }
	}),
	readSpritesheetFrame: t.procedure
		.input(z.object({ spritesheetPath: absPathSchema, frameName: z.string().min(1) }))
		.query(async ({ input }) => {
			const { spritesheetPath, frameName } = input

			const json = (await fse.readJson(
				spritesheetPath.replace(path.extname(spritesheetPath), '.json')
			)) as TexturePacker.Atlas
			const texture = json.textures.find((texture) =>
				texture.frames.find((frame) => frame.filename === frameName)
			)
			const frameData = texture?.frames.find((frame) => frame.filename === frameName)

			if (!frameData) {
				throw new Error(`Frame '${frameName}' not found in spritesheet '${spritesheetPath}'`)
			}

			const frame = await extractFrameFromSpritesheet(spritesheetPath, frameData)

			return frame
		}),
	writeFile: t.procedure.mutation(async () => {
		// const req = (ctx as any).req as IncomingMessage
		// const res = (ctx as any).res as ServerResponse

		// TODO implement
		return { success: true }
	}),
	writeJson: t.procedure
		.input(
			z.object({
				path: absPathSchema,
				content: z.unknown(),
				options: z
					.object({
						spaces: z.union([z.number(), z.literal('\t')]).optional(),
						replacer: z.function().optional(),
						reviver: z.function().optional(),
					})
					.optional(),
			})
		)
		.mutation(async ({ input }) => {
			const { path, content, options } = input
			await fse.writeJson(path, content, options)
			return { path }
		}),
	duplicate: t.procedure.input(z.object({ path: absPathSchema })).mutation(async ({ input }) => {
		const { path: filePath } = input

		const isDirectory = fse.statSync(filePath).isDirectory()
		if (isDirectory) {
			const newPath = filePath + '-copy'
			fse.ensureDirSync(newPath)
			fse.copySync(filePath, newPath)
			return { path: newPath }
		} else {
			const ext = path.extname(filePath)
			const newPath = filePath.replace(ext, `-copy${ext}`)
			fse.copyFileSync(filePath, newPath)
			return { path: newPath }
		}
	}),
	parseWebFont: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const fontBuffer = await fse.readFile(path)
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
			version: font.version,
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
	}),
})

function isFontCollection(font: Font | FontCollection): font is FontCollection {
	return font.type === 'TTC' || font.type === 'DFont'
}

async function extractFrameFromSpritesheet(spritesheetPath: string, frameData: TexturePacker.Frame) {
	const image = sharp(spritesheetPath)

	const frame = image.extract({
		left: frameData.frame.x,
		top: frameData.frame.y,
		width: frameData.frame.w,
		height: frameData.frame.h,
	})

	return frame.toBuffer()
}

export type AppRouter = typeof appRouter

export const apiServerPlugin: Plugin = {
	name: 'vite-api-plugin',
	configureServer(server) {
		const handler = createHTTPHandler({
			router: appRouter,
			createContext: ({ req, res }) => ({ req, res }),
		})

		server.middlewares.use('/api', (req, res) => {
			handler(req, res)
		})
	},
}
