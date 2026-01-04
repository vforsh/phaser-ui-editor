import { test as base, expect, type Page } from '@playwright/test'

import type { WindowEditorApi } from '../../../src/renderer/control-rpc/expose-window-editor'

declare global {
	interface Window {
		/**
		 * Renderer-side control API exposed for automation.
		 * Installed by `exposeWindowEditor()` in `src/renderer/App.tsx`.
		 */
		editor: WindowEditorApi
	}
}

export type WindowEditorFixture = {
	waitFor: (page: Page, opts?: { timeoutMs?: number }) => Promise<void>
	call: <M extends keyof WindowEditorApi>(
		page: Page,
		method: M,
		...args: Parameters<WindowEditorApi[M]>
	) => Promise<Awaited<ReturnType<WindowEditorApi[M]>>>
}

export const test = base.extend<{ windowEditor: WindowEditorFixture }>({
	// eslint-disable-next-line
	windowEditor: async ({}, use) => {
		const windowEditor: WindowEditorFixture = {
			waitFor: async (page, opts) => {
				if (page.isClosed()) {
					throw new Error('Cannot wait for window.editor: page is closed')
				}

				const timeout = opts?.timeoutMs ?? 60_000
				await page.waitForFunction(() => typeof window.editor?.openProject === 'function', undefined, { timeout })
			},
			call: (async (page, method, ...args) => {
				if (page.isClosed()) {
					throw new Error(`Cannot call window.editor.${String(method)}: page is closed`)
				}

				const [params] = args
				const result = (await page.evaluate(
					async ({ method, params }) => {
						return (window.editor[method] as any)(params)
					},
					{ method, params },
				)) as unknown
				return result
			}) as WindowEditorFixture['call'],
		}

		await use(windowEditor)
	},
})

export { expect }
