## Playwright E2E for Tekton Editor (Electron) — Launch Mode Only

This repo supports Playwright-driven E2E testing of the Tekton Editor desktop app (Electron). This doc covers **launch mode**: build first, then start Electron from Playwright (`_electron.launch`).

### Key architecture you should rely on

- **`window.editor` is the stable automation API** exposed by the renderer at startup:
    - Installed in `src/renderer/App.tsx` via `exposeWindowEditor(appCommands)`.
    - Implemented in `src/renderer/control-rpc/expose-window-editor.ts`.
- **Payload schemas live in the control contract** (Zod):
    - Source of truth: `src/renderer/control-rpc/api/ControlApi.ts`
    - Per-method input/output schema: `src/renderer/control-rpc/api/commands/*.ts`

---

## Launch mode (self-contained): build + Playwright `_electron.launch`

### Step 1: build the app

From repo root:

```bash
npm run build
```

### Step 2: launch Electron from Playwright

Working example lives at: `tests/e2e/specs/tekton.launch.smoke.spec.ts`

Tip: launch with project pre-opened:

- The renderer supports `?projectPath=<absolute-path>` (see `src/renderer/UrlParams.ts` + `src/renderer/components/EditorLayout.tsx`).
- In launch-mode tests, the easiest way to set URL params is `ELECTRON_RENDERER_URL`.
    - This works because the main process loads `ELECTRON_RENDERER_URL` when set and preserves the query string.
    - When `PW_E2E=1`, the app also forces `?e2e=1` automatically (it will not remove other params).

```ts
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { _electron as electron } from 'playwright'

const TESTBED_PROJECT_PATH = '/Users/vlad/dev/papa-cherry-2' // must be absolute

const rendererIndexHtml = path.join(process.cwd(), 'out/renderer/index.html')
const rendererUrl = pathToFileURL(rendererIndexHtml)
rendererUrl.searchParams.set('projectPath', TESTBED_PROJECT_PATH) // auto-open project on boot

const app = await electron.launch({
	args: ['.'],
	env: {
		...process.env,
		PW_E2E: '1',
		ELECTRON_RENDERER_URL: rendererUrl.toString(),
	},
})
```

Important nuance:

- `openProject()` loads project state/assets, but **does not guarantee the canvas scene is booted**.
- `waitForCanvasIdle()` requires `state.canvas.root` to be set, which happens when a **prefab is opened**.
    - So in launch-mode tests, do: `openProject` → `listAssets(types:['prefab'])` → `openPrefab` → `waitForCanvasIdle`.

```ts
import { _electron as electron, type ElectronApplication, type Page } from 'playwright'

const TESTBED_PROJECT_PATH = '/Users/vlad/dev/papa-cherry-2'

// Reusable E2E fixtures (Playwright `test.extend()`): https://playwright.dev/docs/test-fixtures
import { test, expect } from '../fixtures/window-editor'

async function getMainPage(
	app: ElectronApplication,
	windowEditor: { waitFor: (page: Page, opts?: { timeoutMs?: number }) => Promise<void> },
): Promise<Page> {
	// In most cases the first window is the main editor window.
	const page = await app.firstWindow()

	await windowEditor.waitFor(page)

	return page
}

test('launch: open project + wait for idle', async ({ windowEditor }) => {
	const app = await electron.launch({
		// Launch from repo root; Electron uses `package.json` "main" (`out/main/index.js`).
		// If you run from another cwd, adjust this accordingly.
		args: ['.'],
		env: {
			...process.env,
			PW_E2E: '1',
			PW_E2E_INSTANCE_KEY: `tekton.launch.${Date.now()}.${process.pid}`,
		},
	})

	const page = await getMainPage(app, windowEditor)

	await windowEditor.call(page, 'openProject', { path: TESTBED_PROJECT_PATH })

	// Boot the canvas by opening a prefab.
	const prefab = await page.evaluate(async () => {
		const { assets } = await window.editor.listAssets({ types: ['prefab'] })
		const stack = [...assets]
		while (stack.length) {
			const node = stack.shift()
			if (!node) continue
			if (node.type === 'prefab') return node.id
			if (Array.isArray(node.children)) stack.push(...node.children)
		}
		return null
	})
	if (!prefab) throw new Error('No prefab assets found in project')

	await windowEditor.call(page, 'openPrefab', { assetId: prefab })
	await windowEditor.call(page, 'waitForCanvasIdle', { timeoutMs: 90_000, pollMs: 50 })

	// Minimal sanity assertion: we can talk to the API.
	const info = await windowEditor.call(page, 'getProjectInfo', {})
	expect(info).toBeTruthy()

	await app.close()
})
```

### Practical tips

- **Prefer `window.editor.waitForCanvasIdle({})` over timeouts** after actions that affect the canvas.
- **If you don’t know the params** for a method:
    - Open `src/renderer/control-rpc/api/commands/<method>.ts` and read the Zod `input` schema.
    - Or (optional) use `editorctl schema <method>` to print the JSON schema.

---

## What `window.editor` can do (high-signal subset)

`window.editor` methods are exposed in `src/renderer/control-rpc/expose-window-editor.ts` and derived from the Zod control contract.

If you need exact I/O shapes for any method:

- Look at `src/renderer/control-rpc/api/commands/<method>.ts` (Zod `input`/`output`), referenced by `src/renderer/control-rpc/api/ControlApi.ts`.
