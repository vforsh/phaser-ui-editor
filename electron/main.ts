import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerBackendHandlers } from '../src/backend-main/ipc/register-backend-handlers'

let mainWindow: BrowserWindow | null = null

const createWindow = () => {
	const preloadPath = path.join(__dirname, '../preload/index.js')

	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			preload: preloadPath,
		},
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
	registerBackendHandlers()
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
