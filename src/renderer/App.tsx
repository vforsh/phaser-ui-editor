import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/spotlight/styles.css'
import 'mantine-contextmenu/styles.css'
import './styles/layout.css'
import { mainApi } from '@main-api/main-api'
import { AppShell, createTheme, MantineProvider } from '@mantine/core'
import { Notifications, notifications } from '@mantine/notifications'
import { UrlParams } from '@url-params'
import { Check, X } from 'lucide-react'
import { ContextMenuProvider } from 'mantine-contextmenu'
import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { AppCommands } from './AppCommands'
import { AppEvents } from './AppEvents'
import { AssetsSearchPanel } from './components/assetsPanel/AssetsSearchPanel'
import { TypedEventEmitter } from './components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import { ControlRpcCommandsModal } from './components/controlRpcCommands/ControlRpcCommandsModal'
import EditorLayout from './components/EditorLayout'
import { SettingsModal } from './components/settings/SettingsModal'
import { exposeWindowEditor } from './control-rpc/expose-window-editor'
import { useControlRpcBridge } from './control-rpc/renderer-rpc'
import { createContainer } from './di/createContainer'
import { DiProvider } from './di/DiContext'
import { TOKENS } from './di/tokens'
import { UndoHub } from './history/UndoHub'
import { logger } from './logs/logs'
import { LogLevel } from './logs/LogsManager'
import { ModalParamsById } from './modals/ModalIds'
import { ModalService } from './modals/ModalService'
import { isSettingsSectionId } from './settings/EditorSettings'
import { clearSavedData, state, subscribe } from './state/State'

const theme = createTheme({
	primaryColor: 'blue',
	primaryShade: 6,
	// colorScheme: 'dark',
	fontFamily: 'Nunito, sans-serif',
	headings: {
		fontFamily: 'Nunito, sans-serif',
	},
})

function App() {
	const diContainer = useMemo(() => {
		const container = createContainer()

		container.bind({ provide: TOKENS.AppEvents, useValue: new TypedEventEmitter<AppEvents>() })
		const appCommands = new CommandEmitter<AppCommands>('app')
		container.bind({ provide: TOKENS.AppCommands, useValue: appCommands })
		const modalService = new ModalService(appCommands)
		container.bind({ provide: TOKENS.ModalService, useValue: modalService })
		if (import.meta.env.DEV) {
			exposeWindowEditor(appCommands)
		}
		const undoHub = new UndoHub({
			onChange: (historyState) => {
				state.app.history = historyState
			},
		})
		container.bind({ provide: TOKENS.UndoHub, useValue: undoHub })

		return container
	}, [])

	const appCommands = diContainer.get(TOKENS.AppCommands)
	useControlRpcBridge(appCommands)
	const modalService = diContainer.get(TOKENS.ModalService)
	const modalState = useSnapshot(modalService.state)

	const settingsParams =
		modalState.active?.id === 'settings'
			? (modalState.active.params as ModalParamsById['settings'])
			: modalService.getParams('settings')

	const controlRpcParams =
		modalState.active?.id === 'controlRpcCommands'
			? (modalState.active.params as ModalParamsById['controlRpcCommands'])
			: modalService.getParams('controlRpcCommands')

	useEffect(() => {
		if (!window.appMenu) {
			return
		}

		return window.appMenu.onTakeCanvasScreenshot(({ clean }) => {
			void (async () => {
				try {
					const savedPath = await appCommands.emit('take-canvas-screenshot', { clean })
					if (!savedPath) {
						return
					}

					logger.info('Screenshot saved:', savedPath)

					notifications.show({
						title: 'Screenshot saved',
						message: savedPath,
						color: 'green',
						autoClose: 10_000,
						icon: <Check size={16} />,
						onClick: () => {
							void mainApi.open({ path: savedPath })
						},
						style: { cursor: 'pointer' },
					})
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					logger.error('Failed to take screenshot:', message)

					notifications.show({
						title: 'Screenshot failed',
						message,
						color: 'red',
						autoClose: 10_000,
						icon: <X size={16} />,
					})
				}
			})()
		})
	}, [diContainer, appCommands])

	useEffect(() => {
		if (!window.appMenu?.onOpenSettings) {
			return
		}

		return window.appMenu.onOpenSettings(({ section }) => {
			const nextSection = isSettingsSectionId(section) ? section : 'general'
			modalService.open('settings', { sectionId: nextSection })
		})
	}, [modalService])

	useEffect(() => {
		if (!window.appMenu?.onTogglePanel) {
			return
		}

		return window.appMenu.onTogglePanel(({ panel }) => {
			if (panel === 'hierarchy') {
				state.layout.showHierarchyPanel = !state.layout.showHierarchyPanel
			} else if (panel === 'assets') {
				state.layout.showAssetsPanel = !state.layout.showAssetsPanel
			} else if (panel === 'inspector') {
				state.layout.showInspectorPanel = !state.layout.showInspectorPanel
			}
		})
	}, [])

	useEffect(() => {
		if (!window.appMenu?.onOpenControlRpcCommands) {
			return
		}

		return window.appMenu.onOpenControlRpcCommands(() => {
			modalService.open('controlRpcCommands')
		})
	}, [modalService])

	useEffect(() => {
		if (!window.appMenu?.onClearSavedData) {
			return
		}

		return window.appMenu.onClearSavedData(({ skipConfirmation }) => {
			clearSavedData({ skipConfirmation })
		})
	}, [])

	useEffect(() => {
		if (!window.appMenu?.onLogUrlParams) {
			return
		}

		return window.appMenu.onLogUrlParams(() => {
			const presentUrlParams = Object.entries(UrlParams.getAll()).filter(([, value]) => value !== null)

			console.group('URL params')
			if (presentUrlParams.length === 0) {
				console.log('none')
			} else {
				console.log(Object.fromEntries(presentUrlParams))
			}
			console.groupEnd()
		})
	}, [])

	useEffect(() => {
		if (!window.appMenu?.onSetMinLogLevel) {
			return
		}

		const appLogger = logger.getOrCreate('app')

		return window.appMenu.onSetMinLogLevel(({ level }) => {
			if (!level) {
				return
			}

			const levelKey = level as keyof typeof LogLevel
			if (LogLevel[levelKey] === undefined) {
				return
			}

			const nextLevel = LogLevel[levelKey] as LogLevel
			const prevLevel = state.settings.dev.minLogLevel
			if (prevLevel === nextLevel) {
				return
			}

			state.settings.dev.minLogLevel = nextLevel
			logger.setMinLogLevel(nextLevel)
			window.appMenu?.notifyMinLogLevel?.({ level: LogLevel[nextLevel] })
			appLogger.info(`change min log level ${LogLevel[prevLevel]} -> ${LogLevel[nextLevel]}`)
		})
	}, [])

	useEffect(() => {
		if (!window.appMenu?.notifyMinLogLevel) {
			return
		}

		const sendMinLogLevel = (level: LogLevel) => {
			window.appMenu?.notifyMinLogLevel?.({ level: LogLevel[level] })
		}

		let lastLevel = state.settings.dev.minLogLevel
		sendMinLogLevel(lastLevel)

		return subscribe(state, () => {
			const nextLevel = state.settings.dev.minLogLevel
			if (nextLevel === lastLevel) {
				return
			}

			lastLevel = nextLevel
			sendMinLogLevel(nextLevel)
		})
	}, [])

	return (
		<MantineProvider theme={theme} defaultColorScheme="dark">
			<Notifications position="bottom-right" zIndex={5001} />
			<ContextMenuProvider zIndex={5000} shadow="md" borderRadius="md" submenuDelay={0}>
				<DiProvider container={diContainer}>
					<AppShell>
						<EditorLayout />
					</AppShell>
					<AssetsSearchPanel />
					<SettingsModal
						opened={modalState.active?.id === 'settings'}
						onClose={() => modalService.close('settings')}
						activeSectionId={settingsParams.sectionId}
						onSectionChange={(sectionId) => modalService.open('settings', { sectionId })}
					/>
					<ControlRpcCommandsModal
						opened={modalState.active?.id === 'controlRpcCommands'}
						onClose={() => modalService.close('controlRpcCommands')}
						activeGroup={controlRpcParams.group}
						onGroupChange={(group) => modalService.open('controlRpcCommands', { group })}
					/>
				</DiProvider>
			</ContextMenuProvider>
		</MantineProvider>
	)
}

export default App
