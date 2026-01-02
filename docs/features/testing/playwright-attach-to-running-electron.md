### Playwright: attach to an already running Electron app (dev/manual mode)

This doc describes **Variant 2**: you start the app with `npm run dev`, then Playwright **connects to the running renderer** using **CDP (Chrome DevTools Protocol)**.

What you get:

- **Good**: fast local iteration, no need for Playwright to launch Electron.
- **Limits**: you can reliably automate **renderer windows** (React UI). You generally **cannot** control Electron **main process** with CDP. If you need main-process control, use Playwright’s Electron mode (`_electron.launch`) instead.

---

### Prerequisites

- Your app is running via `npm run dev` (electron-vite dev).
- A **remote debugging port** is enabled for the running Electron instance.
- Playwright is installed in the repo.

Install Playwright (one-time):

```bash
npm i -D @playwright/test
npx playwright install chromium
```

---

### Step 1 — enable a remote debugging port (CDP)

Playwright attaches to Electron by connecting to a CDP endpoint like `http://127.0.0.1:9222`.

You have two practical options:

#### Option A (recommended): enable CDP port in dev from `electron/main.ts`

Add this in `electron/main.ts` (near the top, before creating `BrowserWindow`):

```ts
// Dev-only CDP port for Playwright "attach" flow.
// This does NOT change production builds.
if (!app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
}
```

Notes:
- Pick any free port (9222 is just a convention).
- Keep it dev-only to avoid accidentally exposing a debugging port in packaged builds.

#### Option B: pass Electron args (only if your dev runner forwards args)

Electron supports:

```bash
electron --remote-debugging-port=9222 .
```

Whether this works with `electron-vite dev` depends on how arguments are forwarded in your environment. If it doesn’t, use **Option A**.

---

### Step 2 — start the app

Start dev mode:

```bash
npm run dev
```

Verify the CDP endpoint responds:

```bash
curl -s http://127.0.0.1:9222/json/version
```

If it prints JSON (browser info), the port is ready.

---

### Step 3 — connect with Playwright over CDP

Create a test that connects to the running app and finds the renderer window.

Example (`tests/e2e/attach-to-dev-electron.spec.ts`):

```ts
import { test, expect, chromium } from '@playwright/test'

const CDP_URL = process.env.PW_ELECTRON_CDP_URL ?? 'http://127.0.0.1:9222'

function isUsefulAppPage(url: string) {
  // Electron may expose internal targets like devtools / chrome-extension.
  // Try to keep this filter permissive and adjust to your dev URL.
  if (!url) return false
  if (url.startsWith('devtools://')) return false
  if (url.startsWith('chrome-extension://')) return false
  return true
}

test('attach: dev Electron window is reachable', async () => {
  const browser = await chromium.connectOverCDP(CDP_URL)

  try {
    // With CDP there's typically a single "default" context.
    const context = browser.contexts()[0]
    if (!context) throw new Error('No browser contexts found via CDP. Is the port correct?')

    // Find the first real renderer page.
    // In dev it’s commonly something like https://localhost:5173/ (electron-vite sets it).
    const pages = context.pages()
    const page =
      pages.find((p) => isUsefulAppPage(p.url())) ??
      (await context.waitForEvent('page', { timeout: 10_000 }))

    await page.waitForLoadState('domcontentloaded')

    // Replace with a stable selector in your UI when you have one.
    await expect(page.locator('body')).toBeVisible()
  } finally {
    await browser.close()
  }
})
```

Run the test (in a separate terminal while the app is already running):

```bash
npx playwright test tests/e2e/attach-to-dev-electron.spec.ts
```

---

### Troubleshooting

#### Port isn’t open / `ECONNREFUSED`

- Confirm you enabled the port (Option A or B).
- Confirm the port number matches `PW_ELECTRON_CDP_URL`.
- Check for port conflict (another Chrome already on 9222).

#### You connect, but don’t see your app page

CDP can show multiple targets (including DevTools). Improve selection logic:

- Filter by URL substring: `p.url().includes('localhost:5173')`
- Or filter by title: `await p.title()` (slower, but can be more reliable)

#### Self-signed HTTPS in dev (mkcert)

If your dev server runs on `https://localhost:5173` with a local cert, you may need to:

- trust the cert in your OS keychain (mkcert), and/or
- relax checks for the dev session (prefer fixing cert trust first).

---

### When to prefer `_electron.launch` instead of CDP attach

Use Playwright’s Electron mode when you need:

- deterministic lifecycle (test starts/stops the app)
- reliable CI
- access to Electron-level APIs (main process evaluation / app handles)

