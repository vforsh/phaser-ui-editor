import { initTRPC } from '@trpc/server'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import { Font, FontCollection, create } from 'fontkit'
import fse from 'fs-extra'
import { globby } from 'globby'
import sizeOf from 'image-size'
import path from 'path'
import sharp from 'sharp'
import { Plugin } from 'vite'
import { z } from 'zod'

const t = initTRPC.create()

const absPathSchema = z.string().refine((val) => path.isAbsolute(val), 'path should be absolute')

const globbyOptionsSchema = z
	.object({
		cwd: z.string(),
		dot: z.boolean(),
		gitignore: z.boolean(),
		ignore: z.array(z.string()),
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
	remove: t.procedure.input(z.object({ path: absPathSchema })).mutation(async ({ input }) => {
		const { path } = input
		await fse.remove(path)
		return { success: true }
	}),
	rename: t.procedure
		.input(z.object({ oldPath: absPathSchema, newPath: absPathSchema }))
		.mutation(async ({ input }) => {
			const { oldPath, newPath } = input
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
		.input(z.object({ path: absPathSchema, content: z.string().min(2) }))
		.mutation(async ({ input }) => {
			const { path, content } = input
			await fse.writeJson(path, content)
			return { path }
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
