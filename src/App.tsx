import { AppShell, MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import EditorLayout from './components/EditorLayout'

const theme = createTheme({
	primaryColor: 'blue',
	primaryShade: 6,
	colorScheme: 'dark',
	fontFamily: 'Nunito, sans-serif',
	headings: {
		fontFamily: 'Nunito, sans-serif',
	},
})

function App() {
	return (
		<MantineProvider theme={theme} defaultColorScheme="dark">
			<AppShell>
				<EditorLayout />
			</AppShell>
		</MantineProvider>
	)
}

export default App
