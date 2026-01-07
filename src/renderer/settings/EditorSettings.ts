import { settingsSectionIds, type SettingsSectionId, isSettingsSectionId } from '@tekton/control-rpc-contract'
import { z } from 'zod'

import { LogLevel } from '../logs/LogsManager'

export { settingsSectionIds, type SettingsSectionId, isSettingsSectionId }

export const editorSettingsSchema = z.object({
	dev: z.object({
		minLogLevel: z.nativeEnum(LogLevel).default(LogLevel.INFO),
	}),
})

export type EditorSettings = z.infer<typeof editorSettingsSchema>

export const defaultEditorSettings: EditorSettings = {
	dev: {
		minLogLevel: LogLevel.INFO,
	},
}

export const exportedSettingsV1Schema = z.object({
	schemaVersion: z.literal(1),
	exportedAt: z.number().int().nonnegative(),
	settings: editorSettingsSchema,
})

export type ExportedSettingsV1 = z.infer<typeof exportedSettingsV1Schema>
