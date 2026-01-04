import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import 'mantine-contextmenu/styles.css'
import './styles/layout.css'
import { mainApi } from '@main-api/main-api'
import { AppShell, createTheme, MantineProvider } from '@mantine/core'
import { Notifications, notifications } from '@mantine/notifications'
import { Check, X } from 'lucide-react'
import { ContextMenuProvider } from 'mantine-contextmenu'
import { useEffect, useMemo, useState } from 'react'

import type { ControlRpcGroup } from './components/controlRpcCommands/controlRpcCommandsModel'

import { AppCommands } from './AppCommands'
import { AppEvents } from './AppEvents'
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
import { isSettingsSectionId, type SettingsSectionId } from './settings/EditorSettings'
import { state } from './state/State'

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
		exposeWindowEditor(appCommands)
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
	const [settingsOpened, setSettingsOpened] = useState(false)
	const [activeSettingsSectionId, setActiveSettingsSectionId] = useState<SettingsSectionId>('general')
	const [controlRpcCommandsOpened, setControlRpcCommandsOpened] = useState(false)
	const [activeControlRpcGroup, setActiveControlRpcGroup] = useState<ControlRpcGroup>('assets')

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
			setActiveSettingsSectionId(nextSection)
			setSettingsOpened(true)
		})
	}, [])

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
			setControlRpcCommandsOpened(true)
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
					<SettingsModal
						opened={settingsOpened}
						onClose={() => setSettingsOpened(false)}
						activeSectionId={activeSettingsSectionId}
						onSectionChange={setActiveSettingsSectionId}
					/>
					<ControlRpcCommandsModal
						opened={controlRpcCommandsOpened}
						onClose={() => setControlRpcCommandsOpened(false)}
						activeGroup={activeControlRpcGroup}
						onGroupChange={setActiveControlRpcGroup}
					/>
				</DiProvider>
			</ContextMenuProvider>
		</MantineProvider>
	)
}

export default App
