import { app, BrowserWindow, clipboard, dialog, Menu } from 'electron'
import getPort from 'get-port'
import path from 'node:path'
import { ControlRpcServer } from '../src/backend-main/control-rpc/main-rpc'
import { registerBackendHandlers } from '../src/backend-main/ipc/register-backend-handlers'
import { createRendererConsoleFileLogger } from './renderer-logger'

let mainWindow: BrowserWindow | null = null
let controlRpcServer: ControlRpcServer | null = null
let controlRpcAddress = ''
let rendererLogger: ReturnType<typeof createRendererConsoleFileLogger> | null = null

const isPlaywrightE2E = process.env.PW_E2E === '1'

// Dev-only CDP port for Playwright "attach" mode.
// Keep this disabled for normal dev to avoid exposing a debugging port by accident.
if (!app.isPackaged && isPlaywrightE2E) {
	app.commandLine.appendSwitch('remote-debugging-port', process.env.PW_E2E_CDP_PORT ?? '9222')
}

app.whenReady().then(() => {
	createWindow()

	// Kick off the renderer ASAP; do the rest right after.
	setImmediate(() => registerBackendHandlers())
	setImmediate(() => createAppMenu())
	setImmediate(() => setupControlRpcServer())

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

const createWindow = () => {
	const preloadPath = path.join(__dirname, '../preload/preload.cjs')

	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		show: false,
		backgroundColor: '#0b0b0b',
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			preload: preloadPath,
		},
	})

	if (!app.isPackaged && !isPlaywrightE2E) {
		const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
		rendererLogger = createRendererConsoleFileLogger({
			logsDir: path.join(process.cwd(), 'logs'),
			runId,
		})
		rendererLogger.attachToWebContents(mainWindow.webContents)
	}

	mainWindow.once('ready-to-show', () => {
		if (!mainWindow) {
			return
		}

		mainWindow.maximize()
		mainWindow.show()

		if (!app.isPackaged && !isPlaywrightE2E) {
			// DevTools can noticeably slow down initial paint; open it right after the first render.
			setTimeout(() => mainWindow?.webContents.openDevTools({ mode: 'right' }), 250)
		}
	})

	const rendererUrl = process.env.ELECTRON_RENDERER_URL
	if (rendererUrl) {
		mainWindow.loadURL(rendererUrl)
	} else {
		const indexPath = path.join(__dirname, '../renderer/index.html')
		mainWindow.loadFile(indexPath)
	}
}

const createAppMenu = () => {
	const isMac = process.platform === 'darwin'
	const openSettings = () => {
		const win = BrowserWindow.getFocusedWindow() ?? mainWindow
		if (!win) {
			return
		}

		win.webContents.send('menu:open-settings', { section: 'general' })
	}

	const macAppMenu: Electron.MenuItemConstructorOptions[] = isMac
		? [
				{
					label: app.name,
					submenu: [
						{
							label: 'Settings...',
							accelerator: 'CmdOrCtrl+,',
							click: openSettings,
						},
						{ role: 'about' },
						{ type: 'separator' as const },
						{ role: 'services' },
						{ type: 'separator' as const },
						{ role: 'hide' },
						{ role: 'hideOthers' },
						{ role: 'unhide' },
						{ type: 'separator' as const },
						{ role: 'quit' },
					],
				},
			]
		: []

	const macWindowMenu: Electron.MenuItemConstructorOptions[] = isMac ? [{ role: 'front' }] : []

	const template: Electron.MenuItemConstructorOptions[] = [
		...macAppMenu,
		{ role: 'editMenu' },
		{
			label: 'View',
			submenu: [
				{ role: 'reload' },
				{ role: 'forceReload' },
				{ type: 'separator' as const },
				{ role: 'toggleDevTools' },
				{ type: 'separator' as const },
				{ role: 'resetZoom' },
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ type: 'separator' as const },
				{ role: 'togglefullscreen' },
				{ type: 'separator' as const },
				{
					label: 'Toggle Hierarchy Panel',
					accelerator: 'CmdOrCtrl+1',
					click: () => {
						const win = BrowserWindow.getFocusedWindow() ?? mainWindow
						win?.webContents.send('menu:toggle-panel', { panel: 'hierarchy' })
					},
				},
				{
					label: 'Toggle Assets Panel',
					accelerator: 'CmdOrCtrl+2',
					click: () => {
						const win = BrowserWindow.getFocusedWindow() ?? mainWindow
						win?.webContents.send('menu:toggle-panel', { panel: 'assets' })
					},
				},
				{
					label: 'Toggle Inspector Panel',
					accelerator: 'CmdOrCtrl+3',
					click: () => {
						const win = BrowserWindow.getFocusedWindow() ?? mainWindow
						win?.webContents.send('menu:toggle-panel', { panel: 'inspector' })
					},
				},
				{ type: 'separator' as const },
				...(!isMac
					? ([
							{
								label: 'Settings...',
								accelerator: 'CmdOrCtrl+,',
								click: openSettings,
							},
							{ type: 'separator' as const },
						] as const)
					: []),
				{
					label: 'Take Canvas Screenshot',
					click: () => {
						const win = BrowserWindow.getFocusedWindow() ?? mainWindow
						if (!win) {
							return
						}

						win.webContents.send('menu:take-canvas-screenshot', { clean: false })
					},
				},
				{
					label: 'Take Clean Canvas Screenshot',
					click: () => {
						const win = BrowserWindow.getFocusedWindow() ?? mainWindow
						if (!win) {
							return
						}

						win.webContents.send('menu:take-canvas-screenshot', { clean: true })
					},
				},
			] as Electron.MenuItemConstructorOptions[],
		},
		{
			label: 'Window',
			submenu: [{ role: 'minimize' }, { role: 'close' }, ...macWindowMenu] as Electron.MenuItemConstructorOptions[],
		},
		{
			label: 'Help',
			submenu: [
				{
					label: 'Control RPC Address',
					click: showControlRpcAddressPopup,
				},
			] as Electron.MenuItemConstructorOptions[],
		},
	]

	Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

const showControlRpcAddressPopup = () => {
	if (!mainWindow) {
		return
	}

	dialog
		.showMessageBox(mainWindow, {
			title: 'Control RPC Address',
			message: `The editor is listening for control commands at:\n\n${controlRpcAddress || 'Not started yet'}`,
			type: 'info',
			buttons: ['OK', 'Copy to Clipboard'],
			defaultId: 0,
		})
		.then(({ response }) => {
			if (response === 1 && controlRpcAddress) {
				clipboard.writeText(controlRpcAddress)
			}
		})
}

async function setupControlRpcServer() {
	const preferredPort = Number(process.env.EDITOR_CONTROL_WS_PORT) || 17870
	const port = await getPort({ port: preferredPort })
	const protocol: 'ws' | 'wss' = 'ws'
	controlRpcAddress = `${protocol}://127.0.0.1:${port}`
	controlRpcServer = new ControlRpcServer({ port, protocol })
	controlRpcServer.start()
	console.log(`[control-rpc] ${controlRpcAddress}`)
}

app.on('window-all-closed', () => {
	controlRpcServer?.stop()
	app.quit()
})

app.on('before-quit', () => {
	rendererLogger?.dispose()
})
