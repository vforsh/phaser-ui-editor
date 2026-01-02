import { app, BrowserWindow, Menu } from 'electron'
import path from 'node:path'
import { registerBackendHandlers } from '../src/backend-main/ipc/register-backend-handlers'
import { ControlRpcServer } from '../src/backend-main/control-rpc/main-rpc'

let mainWindow: BrowserWindow | null = null
let controlRpcServer: ControlRpcServer | null = null

const isPlaywrightE2E = process.env.PW_E2E === '1'

// Dev-only CDP port for Playwright "attach" mode.
// Keep this disabled for normal dev to avoid exposing a debugging port by accident.
if (!app.isPackaged && isPlaywrightE2E) {
	app.commandLine.appendSwitch('remote-debugging-port', process.env.PW_E2E_CDP_PORT ?? '9222')
}

const createAppMenu = () => {
	const isMac = process.platform === 'darwin'
	const macAppMenu: Electron.MenuItemConstructorOptions[] = isMac
		? [
				{
					label: app.name,
					submenu: [
						{ role: 'about' },
						{ type: 'separator' },
						{ role: 'services' },
						{ type: 'separator' },
						{ role: 'hide' },
						{ role: 'hideOthers' },
						{ role: 'unhide' },
						{ type: 'separator' },
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
				{ type: 'separator' },
				{ role: 'toggleDevTools' },
				{ type: 'separator' },
				{ role: 'resetZoom' },
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' },
			],
		},
		{
			label: 'Window',
			submenu: [
				{ role: 'minimize' },
				{ role: 'close' },
				...macWindowMenu,
			],
		},
	]

	Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

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

app.whenReady().then(() => {
	createWindow()
	// Kick off the renderer ASAP; do the rest right after.
	setImmediate(() => registerBackendHandlers())
	setImmediate(() => createAppMenu())

	if (!app.isPackaged) {
		const port = Number(process.env.EDITOR_CONTROL_WS_PORT) || 17870
		controlRpcServer = new ControlRpcServer({ port })
		controlRpcServer.start()
		console.log(`[control-rpc] ws://127.0.0.1:${port}`)
	}

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	controlRpcServer?.stop()
	app.quit()
})
