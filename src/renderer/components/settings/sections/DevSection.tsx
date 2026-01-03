import { Button, Group, Select, Stack, Text } from '@mantine/core'
import { useMemo } from 'react'
import { logger } from '../../../logs/logs'
import { LogLevel } from '../../../logs/LogsManager'
import { clearSavedData, state, useSnapshot } from '../../../state/State'

export function DevSection() {
	const settingsSnap = useSnapshot(state).settings

	const logLevelOptions = useMemo(
		() =>
			(Object.values(LogLevel).filter((value) => typeof value === 'number') as LogLevel[]).map((level) => ({
				value: String(level),
				label: LogLevel[level],
			})),
		[]
	)

	const handleLogLevelChange = (value: string | null) => {
		if (!value) {
			return
		}

		const parsed = Number(value)
		if (Number.isNaN(parsed)) {
			return
		}

		const nextLevel = parsed as LogLevel
		state.settings.dev.minLogLevel = nextLevel
		logger.setMinLogLevel(nextLevel)
	}

	const handleClearSavedData = () => {
		const confirmed = window.confirm(
			'Clear all saved editor data (including settings)? The app will reload after clearing.'
		)
		if (!confirmed) {
			return
		}

		clearSavedData()
	}

	return (
		<Stack gap="lg">
			<Stack gap="xs">
				<Text size="sm" fw={600}>
					Minimal Log Level
				</Text>
				<Select
					data={logLevelOptions}
					value={String(settingsSnap.dev.minLogLevel)}
					onChange={handleLogLevelChange}
					allowDeselect={false}
					description="Controls the minimum level that will be printed to the console."
				/>
			</Stack>

			<Stack gap={6}>
				<Text size="sm" fw={600}>
					Clear Saved Data
				</Text>
				<Text size="sm" c="dimmed">
					Clears all locally saved editor data, including settings, and reloads the app.
				</Text>
				<Group>
					<Button color="red" variant="light" onClick={handleClearSavedData}>
						Clear Saved Data
					</Button>
				</Group>
			</Stack>
		</Stack>
	)
}
