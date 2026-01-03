import type { BrowserWindow } from 'electron'

export interface ElectronAppApi {
  setAppUserModelId(appId?: string): void
}

export interface OptimizerApi {
  watchWindowShortcuts(window: BrowserWindow): void
}

export interface IsEnv {
  dev: boolean
  prod: boolean
  macOS: boolean
  windows: boolean
  linux: boolean
}

export const is: IsEnv
export const optimizer: OptimizerApi
export const electronApp: ElectronAppApi
export const platform: NodeJS.Platform
