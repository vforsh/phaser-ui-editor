import { ipcRenderer } from 'electron'

const MENU_TAKE_CANVAS_SCREENSHOT = 'menu:take-canvas-screenshot'
const MENU_OPEN_SETTINGS = 'menu:open-settings'
const MENU_TOGGLE_PANEL = 'menu:toggle-panel'
const MENU_OPEN_CONTROL_RPC_COMMANDS = 'menu:open-control-rpc-commands'
const MENU_CLEAR_SAVED_DATA = 'menu:clear-saved-data'
const MENU_SET_MIN_LOG_LEVEL = 'menu:set-min-log-level'
const MENU_UPDATE_MIN_LOG_LEVEL = 'menu:update-min-log-level'

type SettingsSectionId = 'general' | 'hierarchy' | 'canvas' | 'assets' | 'inspector' | 'dev' | 'misc'
type PanelId = 'hierarchy' | 'assets' | 'inspector'

/**
 * Creates an API object for interacting with the application menu.
 * These methods allow the renderer to subscribe to menu-related events.
 */
export function createAppMenu() {
	return {
		onTakeCanvasScreenshot: (callback: (payload: { clean?: boolean }) => void) => {
			const listener = (_event: unknown, payload: { clean?: boolean }) => {
				callback(payload ?? {})
			}

			ipcRenderer.on(MENU_TAKE_CANVAS_SCREENSHOT, listener)

			return () => {
				ipcRenderer.off(MENU_TAKE_CANVAS_SCREENSHOT, listener)
			}
		},
		onOpenSettings: (callback: (payload: { section?: SettingsSectionId }) => void) => {
			const listener = (_event: unknown, payload: { section?: SettingsSectionId }) => {
				callback(payload ?? {})
			}

			ipcRenderer.on(MENU_OPEN_SETTINGS, listener)

			return () => {
				ipcRenderer.off(MENU_OPEN_SETTINGS, listener)
			}
		},
		onTogglePanel: (callback: (payload: { panel: PanelId }) => void) => {
			const listener = (_event: unknown, payload: { panel: PanelId }) => {
				callback(payload)
			}

			ipcRenderer.on(MENU_TOGGLE_PANEL, listener)

			return () => {
				ipcRenderer.off(MENU_TOGGLE_PANEL, listener)
			}
		},
		onOpenControlRpcCommands: (callback: () => void) => {
			const listener = (_event: unknown, payload: Record<string, never>) => {
				callback()
			}

			ipcRenderer.on(MENU_OPEN_CONTROL_RPC_COMMANDS, listener)

			return () => {
				ipcRenderer.off(MENU_OPEN_CONTROL_RPC_COMMANDS, listener)
			}
		},
		onClearSavedData: (callback: (payload: { skipConfirmation?: boolean }) => void) => {
			const listener = (_event: unknown, payload: { skipConfirmation?: boolean }) => {
				callback(payload ?? {})
			}

			ipcRenderer.on(MENU_CLEAR_SAVED_DATA, listener)

			return () => {
				ipcRenderer.off(MENU_CLEAR_SAVED_DATA, listener)
			}
		},
		onSetMinLogLevel: (callback: (payload: { level?: string }) => void) => {
			const listener = (_event: unknown, payload: { level?: string }) => {
				callback(payload ?? {})
			}

			ipcRenderer.on(MENU_SET_MIN_LOG_LEVEL, listener)

			return () => {
				ipcRenderer.off(MENU_SET_MIN_LOG_LEVEL, listener)
			}
		},
		notifyMinLogLevel: (payload: { level?: string }) => {
			ipcRenderer.send(MENU_UPDATE_MIN_LOG_LEVEL, payload ?? {})
		},
	}
}
