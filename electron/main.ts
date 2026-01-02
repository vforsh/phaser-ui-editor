import { app, BrowserWindow, Menu } from 'electron'
import path from 'node:path'
import { registerBackendHandlers } from '../src/backend-main/ipc/register-backend-handlers'

let mainWindow: BrowserWindow | null = null

const createAppMenu = () => {
	const template: Electron.MenuItemConstructorOptions[] = [
		...(process.platform === 'darwin'
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
			: []),
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
				...(process.platform === 'darwin' ? [{ role: 'front' }] : []),
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
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			preload: preloadPath,
		},
	})
	mainWindow.maximize()

	const rendererUrl = process.env.ELECTRON_RENDERER_URL
	if (rendererUrl) {
		mainWindow.loadURL(rendererUrl)
	} else {
		const indexPath = path.join(__dirname, '../renderer/index.html')
		mainWindow.loadFile(indexPath)
	}

	if (!app.isPackaged) {
		mainWindow.webContents.openDevTools({ mode: 'right' })
	}
}

app.whenReady().then(() => {
	registerBackendHandlers()
	createAppMenu()
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	app.quit()
})
