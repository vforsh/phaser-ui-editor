import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import 'mantine-contextmenu/styles.css'
import './layout.css'

import { AppShell, MantineProvider, createTheme } from '@mantine/core'
import { notifications, Notifications } from '@mantine/notifications'
import { urlParams } from '@url-params'
import { ContextMenuProvider } from 'mantine-contextmenu'
import { useEffect, useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { AppCommands } from './AppCommands'
import { AppEvents } from './AppEvents'
import { TypedEventEmitter } from './components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import EditorLayout from './components/EditorLayout'
import { exposeWindowEditor } from './control-rpc/expose-window-editor'
import { useControlRpcBridge } from './control-rpc/renderer-rpc'
import { createContainer } from './di/createContainer'
import { DiProvider } from './di/DiContext'
import { TOKENS } from './di/tokens'
import { UndoHub } from './history/UndoHub'
import { logger } from './logs/logs'
import { backend } from './backend-renderer/backend'
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
	if (urlParams.get('clearConsole') === 'app' || urlParams.getBool('clearConsole')) {
		console.clear()
	}

	const diContainer = useMemo(() => {
		const container = createContainer()

		container.registerInstance(TOKENS.AppEvents, new TypedEventEmitter<AppEvents>())
		const appCommands = new CommandEmitter<AppCommands>('app')
		container.registerInstance(TOKENS.AppCommands, appCommands)
		exposeWindowEditor(appCommands)
		const undoHub = new UndoHub({
			onChange: (historyState) => {
				state.app.history = historyState
			},
		})
		container.registerInstance(TOKENS.UndoHub, undoHub)

		return container
	}, [])

	const appCommands = diContainer.resolve(TOKENS.AppCommands)
	useControlRpcBridge(appCommands)

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
							void backend.open({ path: savedPath })
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

	return (
		<MantineProvider theme={theme} defaultColorScheme="dark">
			<Notifications position="bottom-right" zIndex={5001} />
			<ContextMenuProvider zIndex={5000} shadow="md" borderRadius="md" submenuDelay={0}>
				<DiProvider container={diContainer}>
					<AppShell>
						<EditorLayout />
					</AppShell>
				</DiProvider>
			</ContextMenuProvider>
		</MantineProvider>
	)
}

export default App
