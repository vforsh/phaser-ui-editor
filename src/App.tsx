import { AppShell, MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
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
			<AppShell>
				<EditorLayout />
			</AppShell>
		</MantineProvider>
	)
}

export default App
