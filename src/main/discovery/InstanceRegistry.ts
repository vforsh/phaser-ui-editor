import type { InstanceRecord } from '@tekton/control-rpc-contract'

import { getRegistryDir } from '@tekton/control-rpc-contract/discovery/registry'
import fs from 'node:fs'
import path from 'node:path'

import { logger } from '../../renderer/logs/logs'

const HEARTBEAT_MS = 2000

export class InstanceRegistry {
	private readonly registryDir = getRegistryDir()
	private readonly filePath: string
	private readonly tmpPath: string
	private readonly logger = logger.getOrCreate('discovery-registry')
	private heartbeat: NodeJS.Timeout | null = null
	private disposed = false

	constructor(
		private record: InstanceRecord,
		private readonly heartbeatMs: number = HEARTBEAT_MS,
	) {
		this.filePath = path.join(this.registryDir, `${record.instanceId}.json`)
		this.tmpPath = path.join(this.registryDir, `.${record.instanceId}.tmp`)
	}

	start(): void {
		if (this.disposed) {
			return
		}
		this.queueWrite()
		this.heartbeat = setInterval(() => {
			this.touch()
		}, this.heartbeatMs)
	}

	getRecord(): InstanceRecord {
		return { ...this.record }
	}

	touch(): void {
		if (this.disposed) {
			return
		}
		this.record = {
			...this.record,
			updatedAt: Date.now(),
		}
		this.queueWrite()
	}

	updateProjectPath(projectPath: string | null): void {
		if (this.disposed) {
			return
		}
		this.record = {
			...this.record,
			projectPath,
			updatedAt: Date.now(),
		}
		this.queueWrite()
	}

	dispose(): void {
		if (this.disposed) {
			return
		}
		this.disposed = true

		if (this.heartbeat) {
			clearInterval(this.heartbeat)
			this.heartbeat = null
		}

		void fs.promises.unlink(this.filePath).catch(() => {})
	}

	private queueWrite(): void {
		if (this.disposed) {
			return
		}
		void this.persist().catch((error) => {
			this.logger.warn('Failed to persist instance registry', { error })
		})
	}

	private async persist(): Promise<void> {
		await fs.promises.mkdir(this.registryDir, { recursive: true })
		await fs.promises.writeFile(this.tmpPath, JSON.stringify(this.record), 'utf8')
		await fs.promises.rename(this.tmpPath, this.filePath)
	}
}
