import type { IncomingMessage, ServerResponse } from 'http'
import path from 'path'
import { initTRPC } from '@trpc/server'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import fse from 'fs-extra'
import { globby } from 'globby'
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
	globby: t.procedure.input(z.object({ patterns: z.array(z.string()), options: globbyOptionsSchema })).query(async ({ input }) => {
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
	rename: t.procedure.input(z.object({ oldPath: absPathSchema, newPath: absPathSchema })).mutation(async ({ input }) => {
		const { oldPath, newPath } = input
		await fse.rename(oldPath, newPath)
		return { success: true }
	}),
	readFile: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const file = await fse.readFile(path)
		return file
	}),
	readJson: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const json = await fse.readJson(path)
		return { content: json }
	}),
	readText: t.procedure.input(z.object({ path: absPathSchema })).query(async ({ input }) => {
		const { path } = input
		const text = await fse.readFile(path, 'utf-8')
		return { content: text }
	}),
	writeFile: t.procedure.mutation(async ({ ctx }) => {
		const req = (ctx as any).req as IncomingMessage
		const res = (ctx as any).res as ServerResponse

		// TODO implement
		return { success: true }
	}),
	writeJson: t.procedure.input(z.object({ path: absPathSchema, content: z.string().min(2) })).mutation(async ({ input }) => {
		const { path, content } = input
		await fse.writeJson(path, content)
		return { path }
	}),
})

export type AppRouter = typeof appRouter

export const apiServerPlugin: Plugin = {
	name: 'vite-api-plugin',
	configureServer(server) {
		const handler = createHTTPHandler({
			router: appRouter,
			createContext: ({ req, res }) => ({ req, res }),
		})

		server.middlewares.use('/api', (req, res, next) => {
			handler(req, res)
		})
	},
}
