import { _electron as electron, type ElectronApplication, type Page } from 'playwright'

import { test, expect } from '../fixtures/window-editor'

const TESTBED_PROJECT_PATH = '/Users/vlad/dev/papa-cherry-2'

async function getMainPage(
	app: ElectronApplication,
	windowEditor: { waitFor: (page: Page, opts?: { timeoutMs?: number }) => Promise<void> },
): Promise<Page> {
	const page = await app.firstWindow()

	await windowEditor.waitFor(page, { timeoutMs: 60_000 })

	return page
}

test('tekton: launch smoke (window.editor + openProject + waitForCanvasIdle)', async ({ windowEditor }) => {
	test.setTimeout(120_000)

	const app = await electron.launch({
		args: ['.'],
		env: {
			...process.env,
			PW_E2E: '1',
			PW_E2E_INSTANCE_KEY: `tekton.launch.smoke.${Date.now()}.${process.pid}`,
		},
	})

	try {
		const proc = app.process()
		proc?.stdout?.on('data', (chunk) => {
			console.log('[electron stdout]', String(chunk).trim())
		})
		proc?.stderr?.on('data', (chunk) => {
			console.error('[electron stderr]', String(chunk).trim())
		})

		const page = await getMainPage(app, windowEditor)
		page.on('pageerror', (err) => {
			console.error('[renderer pageerror]', err)
		})
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				console.error('[renderer console.error]', msg.text())
			}
		})

		await test.step('openProject', async () => {
			await windowEditor.call(page, 'openProject', { path: TESTBED_PROJECT_PATH })
		})

		await test.step('open first prefab (to boot the MainScene / set canvas root)', async () => {
			const prefab = await page.evaluate(async () => {
				const { assets } = await window.editor.listAssets({ types: ['prefab'] })

				const findFirstPrefab = (nodes: any[]): { id: string; path: string } | null => {
					for (const node of nodes) {
						if (node?.type === 'prefab' && typeof node.id === 'string' && typeof node.path === 'string') {
							return { id: node.id, path: node.path }
						}
						if (Array.isArray(node?.children)) {
							const found = findFirstPrefab(node.children)
							if (found) {
								return found
							}
						}
					}
					return null
				}

				return findFirstPrefab(assets)
			})

			if (!prefab) {
				throw new Error('No prefab assets found in project; cannot open a prefab for canvas boot')
			}

			await windowEditor.call(page, 'openPrefab', { assetId: prefab.id })
		})

		await test.step('waitForCanvasIdle', async () => {
			const idleResult = await windowEditor.call(page, 'waitForCanvasIdle', { timeoutMs: 90_000, pollMs: 50 })

			// Handler returns { ok: boolean, error?: ... } — fail fast with context.
			const ok = (idleResult as { ok?: unknown }).ok
			if (ok !== true) {
				throw new Error(`waitForCanvasIdle failed: ${JSON.stringify(idleResult)}`)
			}
		})

		await test.step('getProjectInfo', async () => {
			const projectInfo = await windowEditor.call(page, 'getProjectInfo', {})
			expect(projectInfo).toBeTruthy()
		})

		await test.step('listHierarchy (sanity)', async () => {
			const root = await windowEditor.call(page, 'listHierarchy', {})
			expect(root).toBeTruthy()
		})
	} finally {
		await app.close()
	}
})
