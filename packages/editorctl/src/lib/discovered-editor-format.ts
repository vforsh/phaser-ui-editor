import type { DiscoveredEditor } from '@tekton/editorctl-client'

import path from 'node:path'

export function formatDiscoveredEditor(entry: DiscoveredEditor): string {
	const e2eValue = entry.e2e?.enabled ? `on(${entry.e2e.instanceKey})` : 'off'
	const projectValue = entry.projectPath ?? 'null'
	const appVersion = entry.appVersion ?? 'unknown'
	const logsDir = getLogsDir(entry) ?? 'unknown'

	return [
		`wsUrl=${entry.wsUrl}`,
		`wsPort=${entry.wsPort}`,
		`pid=${entry.pid}`,
		`launchDir="${entry.appLaunchDir}"`,
		`logsDir="${logsDir}"`,
		`project="${projectValue}"`,
		`appVersion=${appVersion}`,
		`startedAt=${entry.startedAt}`,
		`updatedAt=${entry.updatedAt}`,
		`instanceId=${entry.instanceId}`,
		`e2e=${e2eValue}`,
	].join(' ')
}

export function getLogsDir(entry: DiscoveredEditor): string | undefined {
	if (!entry.appLaunchDir) {
		return undefined
	}

	return path.join(entry.appLaunchDir, 'logs')
}
