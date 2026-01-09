import { instanceRecordSchema, type InstanceRecord } from '@tekton/control-rpc-contract'
import { getRegistryDir } from '@tekton/control-rpc-contract/discovery/registry'
import fs from 'node:fs'
import path from 'node:path'

import { pingEditor } from './ping'

export type DiscoveredEditor = InstanceRecord

export type DiscoverEditorsOptions = {
	ping?: boolean
	pingTimeoutMs?: number
	maxStaleMs?: number
}

const DEFAULT_PING_TIMEOUT_MS = 400
const DEFAULT_MAX_STALE_MS = 8000

export async function discoverEditors(options: DiscoverEditorsOptions = {}): Promise<DiscoveredEditor[]> {
	const registryDir = getRegistryDir()
	const ping = options.ping ?? true
	const pingTimeoutMs = options.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT_MS
	const maxStaleMs = options.maxStaleMs ?? DEFAULT_MAX_STALE_MS

	const files = await fs.promises.readdir(registryDir).catch((error: NodeJS.ErrnoException) => {
		if (error?.code === 'ENOENT') {
			return [] as string[]
		}
		throw error
	})

	const now = Date.now()
	const records: InstanceRecord[] = []

	for (const file of files) {
		if (path.extname(file) !== '.json') {
			continue
		}

		const filePath = path.join(registryDir, file)
		const raw = await fs.promises.readFile(filePath, 'utf8').catch(() => null)
		if (!raw) {
			continue
		}

		let parsed: unknown
		try {
			parsed = JSON.parse(raw)
		} catch {
			continue
		}

		const result = instanceRecordSchema.safeParse(parsed)
		if (!result.success) {
			continue
		}

		if (result.data.updatedAt < now - maxStaleMs) {
			void fs.promises.unlink(filePath).catch(() => {})
			continue
		}

		records.push(result.data)
	}

	if (!ping) {
		return records
	}

	const responses = await Promise.all(
		records.map(async (record) => {
			try {
				return await pingEditor({ port: record.wsPort, timeoutMs: pingTimeoutMs })
			} catch {
				void fs.promises.unlink(path.join(registryDir, `${record.instanceId}.json`)).catch(() => {})
				return null
			}
		}),
	)

	return responses.filter((entry): entry is InstanceRecord => Boolean(entry))
}
