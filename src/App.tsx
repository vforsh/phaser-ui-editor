import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import 'mantine-contextmenu/styles.css'
import './layout.css'

import { AppShell, MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { urlParams } from '@url-params'
import { ContextMenuProvider } from 'mantine-contextmenu'
import { ref } from 'valtio'
import { AppCommands } from './AppCommands'
import { AppEvents } from './AppEvents'
import { TypedEventEmitter } from './components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import EditorLayout from './components/EditorLayout'
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

	if (!state.app) {
		state.app = ref({
			// to pass events from main React app to Phaser app
			events: new TypedEventEmitter<AppEvents>(),
			// to pass commands from main React app to Phaser app
			commands: new CommandEmitter<AppCommands>('app'),
		})
	}

	return (
		<MantineProvider theme={theme} defaultColorScheme="dark">
			<Notifications position="bottom-right" zIndex={5001} />
			<ContextMenuProvider zIndex={5000} shadow="md" borderRadius="md" submenuDelay={0}>
				<AppShell>
					<EditorLayout />
				</AppShell>
			</ContextMenuProvider>
		</MantineProvider>
	)
}

export default App
