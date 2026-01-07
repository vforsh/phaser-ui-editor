export const settingsSectionIds = ['general', 'hierarchy', 'canvas', 'assets', 'inspector', 'dev', 'misc'] as const

export type SettingsSectionId = (typeof settingsSectionIds)[number]

export function isSettingsSectionId(value: string | null | undefined): value is SettingsSectionId {
	return typeof value === 'string' && (settingsSectionIds as readonly string[]).includes(value)
}
