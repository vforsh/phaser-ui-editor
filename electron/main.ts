import { app, BrowserWindow, Menu, dialog, clipboard } from 'electron'
import getPort from 'get-port'
import path from 'node:path'
import { ControlRpcServer } from '../src/backend-main/control-rpc/main-rpc'
import { registerBackendHandlers } from '../src/backend-main/ipc/register-backend-handlers'

let mainWindow: BrowserWindow | null = null
let controlRpcServer: ControlRpcServer | null = null
let controlRpcAddress = ''

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
				{ type: 'separator' },
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
			],
		},
		{
			label: 'Window',
			submenu: [{ role: 'minimize' }, { role: 'close' }, ...macWindowMenu],
		},
		{
			label: 'Help',
			submenu: [
				{
					label: 'Control RPC Address',
					click: showControlRpcAddressPopup,
				},
			],
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
	controlRpcAddress = `ws://127.0.0.1:${port}`
	controlRpcServer = new ControlRpcServer({ port })
	controlRpcServer.start()
	console.log(`[control-rpc] ${controlRpcAddress}`)
}

app.on('window-all-closed', () => {
	controlRpcServer?.stop()
	app.quit()
})
