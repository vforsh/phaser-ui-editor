import { chromium, type Browser, type Page } from '@playwright/test'

import { test, expect } from '../fixtures/window-editor'

const CDP_URL = 'http://127.0.0.1:9222'
const TESTBED_PROJECT_PATH = '/Users/vlad/dev/papa-cherry-2'

async function findTektonPage(browser: Browser): Promise<Page> {
	const deadlineMs = Date.now() + 60_000

	while (Date.now() < deadlineMs) {
		for (const context of browser.contexts()) {
			for (const page of context.pages()) {
				try {
					const hasEditor = await page.evaluate(() => {
						return typeof window.editor?.openProject === 'function'
					})
					if (hasEditor) {
						return page
					}
				} catch {
					// Page may be in the middle of navigation; ignore and retry.
				}
			}
		}

		// Small backoff to avoid hammering CDP.
		await new Promise((r) => setTimeout(r, 250))
	}

	throw new Error('Timed out waiting for a page with window.editor (is Tekton started with PW_E2E=1?)')
}

test('tekton: attach smoke (window.editor + openProject)', async ({ windowEditor }) => {
	test.setTimeout(120_000)

	let browser: Browser | null = null
	try {
		browser = await chromium.connectOverCDP(CDP_URL, { timeout: 30_000 })
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		throw new Error(
			`Failed to connect to CDP at '${CDP_URL}'. Start Tekton with:\n` +
				`PW_E2E=1 PW_E2E_CDP_PORT=9222 npm start\n\n` +
				`Original error: ${msg}`,
		)
	}

	try {
		const page = await findTektonPage(browser)

		page.on('pageerror', (err) => {
			console.error('[renderer pageerror]', err)
		})

		await test.step('openProject', async () => {
			await windowEditor.call(page, 'openProject', { path: TESTBED_PROJECT_PATH })
		})
	} finally {
		await browser.close()
	}
})
