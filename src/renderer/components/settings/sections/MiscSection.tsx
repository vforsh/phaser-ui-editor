import { backend } from '@backend/backend'
import { Button, Group, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Check, X } from 'lucide-react'

import { logger } from '../../../logs/logs'
import { exportedSettingsV1Schema, type ExportedSettingsV1 } from '../../../settings/EditorSettings'
import { replaceSettings, state, unproxy } from '../../../state/State'

const settingsFileFilters = [{ name: 'JSON', extensions: ['json'] }]

export function MiscSection() {
	const handleExportSettings = async () => {
		try {
			const payload: ExportedSettingsV1 = {
				schemaVersion: 1,
				exportedAt: Date.now(),
				settings: unproxy(state.settings),
			}

			const result = await backend.saveFileDialog({
				title: 'Export Settings',
				defaultPath: 'phaser-ui-editor.settings.json',
				filters: settingsFileFilters,
			})

			if (result.canceled || !result.path) {
				return
			}

			const savedPath = result.path

			await backend.writeJson({
				path: savedPath,
				content: payload,
				options: { spaces: 2 },
			})

			notifications.show({
				title: 'Settings exported',
				message: savedPath,
				color: 'green',
				autoClose: 10_000,
				icon: <Check size={16} />,
				onClick: () => {
					void backend.showItemInFolder({ path: savedPath })
				},
				style: { cursor: 'pointer' },
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			notifications.show({
				title: 'Failed to export settings',
				message,
				color: 'red',
				autoClose: 10_000,
				icon: <X size={16} />,
			})
		}
	}

	const handleImportSettings = async () => {
		try {
			const result = await backend.selectFile({
				title: 'Import Settings',
				filters: settingsFileFilters,
			})

			if (result.canceled || !result.path) {
				return
			}

			const importPath = result.path
			const fileContents = await backend.readJson({ path: importPath })
			const parsed = exportedSettingsV1Schema.safeParse(fileContents)

			if (!parsed.success) {
				throw new Error(parsed.error.message)
			}

			replaceSettings(parsed.data.settings)
			logger.setMinLogLevel(parsed.data.settings.dev.minLogLevel)

			notifications.show({
				title: 'Settings imported',
				message: importPath,
				color: 'green',
				autoClose: 10_000,
				icon: <Check size={16} />,
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			notifications.show({
				title: 'Failed to import settings',
				message,
				color: 'red',
				autoClose: 10_000,
				icon: <X size={16} />,
			})
		}
	}

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Text size="sm" fw={600}>
					Export Settings
				</Text>
				<Text size="sm" c="dimmed">
					Save your settings to a JSON file.
				</Text>
				<Group>
					<Button variant="light" onClick={handleExportSettings}>
						Export Settings...
					</Button>
				</Group>
			</Stack>

			<Stack gap={6}>
				<Text size="sm" fw={600}>
					Import Settings
				</Text>
				<Text size="sm" c="dimmed">
					Replace current settings with those from a JSON file.
				</Text>
				<Group>
					<Button variant="light" onClick={handleImportSettings}>
						Import Settings...
					</Button>
				</Group>
			</Stack>
		</Stack>
	)
}
