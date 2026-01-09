import { _electron as electron, type ElectronApplication, type Page } from 'playwright'

import { test, expect } from '../fixtures/window-editor'
import { buildRendererUrl } from '../utils/renderer-url'

const TESTBED_PROJECT_PATH = '/Users/vlad/dev/papa-cherry-2'

async function getMainPage(
	app: ElectronApplication,
	windowEditor: { waitFor: (page: Page, opts?: { timeoutMs?: number }) => Promise<void> },
): Promise<Page> {
	const page = await app.firstWindow()

	await windowEditor.waitFor(page, { timeoutMs: 60_000 })

	return page
}

async function waitForProjectOpen(
	page: Page,
	windowEditor: { call: (page: Page, method: string, params: any) => Promise<unknown> },
	timeoutMs = 60_000,
): Promise<void> {
	const deadline = Date.now() + timeoutMs

	while (Date.now() < deadline) {
		try {
			await windowEditor.call(page, 'getProjectInfo', {})
			return
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 250))
		}
	}

	throw new Error('Timed out waiting for project to open')
}

type PrefabSummary = { id: string; path: string; name?: string }

function collectPrefabs(nodes: any[]): PrefabSummary[] {
	const prefabs: PrefabSummary[] = []

	const walk = (items: any[]) => {
		for (const item of items) {
			if (item?.type === 'prefab' && typeof item.id === 'string' && typeof item.path === 'string') {
				prefabs.push({ id: item.id, path: item.path, name: item.name })
			}

			if (Array.isArray(item?.children)) {
				walk(item.children)
			}
		}
	}

	walk(nodes)
	return prefabs
}

test('tekton: launch smoke (window.editor + openProject + openPrefab)', async ({ windowEditor }) => {
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
				const { assets } = await window.editor.listAssetsTree({ types: ['prefab'] })

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

		await test.step('modal control (window.editor)', async () => {
			await windowEditor.call(page, 'closeAllModals', {})

			const initialList = await windowEditor.call(page, 'listModals', {})
			expect((initialList as { activeModalId?: unknown }).activeModalId).toBeNull()

			await windowEditor.call(page, 'openModal', { id: 'settings', params: { sectionId: 'general' } })

			const settingsList = await windowEditor.call(page, 'listModals', {})
			expect((settingsList as { activeModalId?: unknown }).activeModalId).toBe('settings')

			await windowEditor.call(page, 'openModal', { id: 'controlRpcCommands' })

			const commandsList = await windowEditor.call(page, 'listModals', {})
			expect((commandsList as { activeModalId?: unknown }).activeModalId).toBe('controlRpcCommands')

			await windowEditor.call(page, 'closeAllModals', {})
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

test('tekton: launch auto-open prefab via prefabPath', async ({ windowEditor }) => {
	test.setTimeout(180_000)

	const app = await electron.launch({
		args: ['.'],
		env: {
			...process.env,
			PW_E2E: '1',
			PW_E2E_INSTANCE_KEY: `tekton.launch.prefab-path.${Date.now()}.${process.pid}`,
			ELECTRON_RENDERER_URL: buildRendererUrl({ projectPath: TESTBED_PROJECT_PATH }),
		},
	})

	let prefabs: PrefabSummary[] = []

	try {
		const page = await getMainPage(app, windowEditor)
		await waitForProjectOpen(page, windowEditor, 90_000)

		const listResult = await windowEditor.call(page, 'listAssetsTree', { types: ['prefab'] })
		const assets = (listResult as { assets?: unknown }).assets
		prefabs = Array.isArray(assets) ? collectPrefabs(assets) : []

		if (prefabs.length === 0) {
			throw new Error('No prefab assets found in project; cannot validate auto-open behavior')
		}
	} finally {
		await app.close()
	}

	const target = prefabs[0]
	const appWithPrefab = await electron.launch({
		args: ['.'],
		env: {
			...process.env,
			PW_E2E: '1',
			PW_E2E_INSTANCE_KEY: `tekton.launch.prefab-path.open.${Date.now()}.${process.pid}`,
			ELECTRON_RENDERER_URL: buildRendererUrl({ projectPath: TESTBED_PROJECT_PATH, prefabPath: target.path }),
		},
	})

	try {
		const page = await getMainPage(appWithPrefab, windowEditor)
		await waitForProjectOpen(page, windowEditor, 90_000)

		const canvasState = await windowEditor.call(page, 'getCanvasState', {})
		const currentPrefab = (canvasState as { currentPrefab?: PrefabSummary | null }).currentPrefab

		expect(currentPrefab).toBeTruthy()
		expect(currentPrefab?.id).toBe(target.id)
	} finally {
		await appWithPrefab.close()
	}
})

test('tekton: prefabId overrides prefabPath on boot', async ({ windowEditor }) => {
	test.setTimeout(180_000)

	const app = await electron.launch({
		args: ['.'],
		env: {
			...process.env,
			PW_E2E: '1',
			PW_E2E_INSTANCE_KEY: `tekton.launch.prefab-precedence.${Date.now()}.${process.pid}`,
			ELECTRON_RENDERER_URL: buildRendererUrl({ projectPath: TESTBED_PROJECT_PATH }),
		},
	})

	let prefabs: PrefabSummary[] = []

	try {
		const page = await getMainPage(app, windowEditor)
		await waitForProjectOpen(page, windowEditor, 90_000)

		const listResult = await windowEditor.call(page, 'listAssetsTree', { types: ['prefab'] })
		const assets = (listResult as { assets?: unknown }).assets
		prefabs = Array.isArray(assets) ? collectPrefabs(assets) : []

		if (prefabs.length < 2) {
			test.skip(true, 'Need at least two prefabs to verify prefabId precedence')
		}
	} finally {
		await app.close()
	}

	const primary = prefabs[0]
	const secondary = prefabs[1]

	const appWithBoth = await electron.launch({
		args: ['.'],
		env: {
			...process.env,
			PW_E2E: '1',
			PW_E2E_INSTANCE_KEY: `tekton.launch.prefab-precedence.open.${Date.now()}.${process.pid}`,
			ELECTRON_RENDERER_URL: buildRendererUrl({
				projectPath: TESTBED_PROJECT_PATH,
				prefabId: primary.id,
				prefabPath: secondary.path,
			}),
		},
	})

	try {
		const page = await getMainPage(appWithBoth, windowEditor)
		await waitForProjectOpen(page, windowEditor, 90_000)

		const canvasState = await windowEditor.call(page, 'getCanvasState', {})
		const currentPrefab = (canvasState as { currentPrefab?: PrefabSummary | null }).currentPrefab

		expect(currentPrefab?.id).toBe(primary.id)
	} finally {
		await appWithBoth.close()
	}
})

test('tekton: invalid prefabPath does not block project open', async ({ windowEditor }) => {
	test.setTimeout(120_000)

	const app = await electron.launch({
		args: ['.'],
		env: {
			...process.env,
			PW_E2E: '1',
			PW_E2E_INSTANCE_KEY: `tekton.launch.prefab-invalid.${Date.now()}.${process.pid}`,
			ELECTRON_RENDERER_URL: buildRendererUrl({
				projectPath: TESTBED_PROJECT_PATH,
				prefabPath: 'assets/prefabs/__missing__.prefab',
			}),
		},
	})

	try {
		const page = await getMainPage(app, windowEditor)
		await waitForProjectOpen(page, windowEditor, 90_000)

		const projectInfo = await windowEditor.call(page, 'getProjectInfo', {})
		expect(projectInfo).toBeTruthy()

		const canvasState = await windowEditor.call(page, 'getCanvasState', {})
		expect(canvasState).toBeTruthy()
	} finally {
		await app.close()
	}
})
