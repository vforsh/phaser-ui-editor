import type { InstanceRecord } from '@tekton/control-rpc-contract'

import { APP_ID } from '@tekton/control-rpc-contract'
import { app, BrowserWindow } from 'electron'
import getPort from 'get-port'
import { randomUUID } from 'node:crypto'

import { ControlRpcServer } from './ControlRpcServer'
import { InstanceRegistry } from './discovery/InstanceRegistry'
import { editorRegistry } from './EditorRegistry'

export interface ControlRpcStatus {
	enabled: boolean
	wsUrl: string | null
	wsPort: number | null
}

class ControlRpcManager {
	private controlRpcServer: ControlRpcServer | null = null
	private instanceRegistry: InstanceRegistry | null = null
	private controlRpcAddress: string | null = null
	private wsPort: number | null = null

	public getStatus(): ControlRpcStatus {
		return {
			enabled: this.controlRpcServer !== null,
			wsUrl: this.controlRpcAddress,
			wsPort: this.wsPort,
		}
	}

	public async setEnabled(enabled: boolean): Promise<ControlRpcStatus> {
		if (enabled) {
			await this.start()
		} else {
			this.stop()
		}
		return this.getStatus()
	}

	private async start() {
		if (this.controlRpcServer) {
			return
		}

		const preferredPort = Number(process.env.EDITOR_CONTROL_WS_PORT) || 17870
		const port = await getPort({ port: preferredPort })
		const protocol: 'ws' | 'wss' = 'ws'
		this.wsPort = port
		this.controlRpcAddress = `${protocol}://127.0.0.1:${port}`

		const instanceId = randomUUID()
		const startedAt = Date.now()
		const record: InstanceRecord = {
			schemaVersion: 1,
			appId: APP_ID,
			instanceId,
			pid: process.pid,
			wsPort: port,
			wsUrl: this.controlRpcAddress,
			appLaunchDir: process.cwd(),
			projectPath: this.getPrimaryProjectPath(),
			startedAt,
			updatedAt: startedAt,
			appVersion: app.getVersion(),
			e2e: this.getE2eMetadata(),
		}

		this.instanceRegistry = new InstanceRegistry(record)
		this.controlRpcServer = new ControlRpcServer({
			port,
			protocol,
			registry: this.instanceRegistry,
			getPrimaryWindowId: () => this.getPrimaryWindowId(),
		})

		this.controlRpcServer.start()
		this.instanceRegistry.start()
		console.log(`[control-rpc] ${this.controlRpcAddress}`)
	}

	public stop() {
		this.instanceRegistry?.dispose()
		this.instanceRegistry = null
		this.controlRpcServer?.stop()
		this.controlRpcServer = null
		this.controlRpcAddress = null
		this.wsPort = null
	}

	private getPrimaryWindowId(): number | null {
		// This should be coordinated with EditorRegistry or passed in
		return editorRegistry.getPrimaryWindowId()
	}

	private getPrimaryProjectPath(): string | null {
		return editorRegistry.getPrimaryProjectPath(this.getPrimaryWindowId())
	}

	private getE2eMetadata(): InstanceRecord['e2e'] {
		const e2eEnabled = process.env.PW_E2E === '1'
		if (!e2eEnabled) {
			return { enabled: false }
		}

		const e2eInstanceKey = process.env.PW_E2E_INSTANCE_KEY
		return {
			enabled: true,
			instanceKey: e2eInstanceKey && e2eInstanceKey.length > 0 ? e2eInstanceKey : 'default',
		}
	}
}

export const controlRpcManager = new ControlRpcManager()
