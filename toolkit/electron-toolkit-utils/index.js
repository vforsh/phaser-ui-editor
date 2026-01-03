import { app } from 'electron'

export const is = {
  dev: !app.isPackaged,
  prod: app.isPackaged,
  macOS: process.platform === 'darwin',
  windows: process.platform === 'win32',
  linux: process.platform === 'linux'
}

export const electronApp = {
  setAppUserModelId(appId) {
    if (process.platform === 'win32') {
      app.setAppUserModelId(appId ?? process.execPath)
    }
  }
}

export const optimizer = {
  watchWindowShortcuts(window) {
    window.webContents.on('before-input-event', (event, input) => {
      const isReloadShortcut =
        input.type === 'keyDown' && (input.key === 'F5' || (input.key?.toLowerCase() === 'r' && (input.control || input.meta)))

      if (isReloadShortcut && !is.dev) {
        event.preventDefault()
      }

      if (is.dev && input.type === 'keyDown' && input.key === 'F12' && !window.webContents.isDevToolsOpened()) {
        window.webContents.openDevTools()
      }
    })
  }
}

export const platform = process.platform
