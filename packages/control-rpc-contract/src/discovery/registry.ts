import os from 'node:os'
import path from 'node:path'

export { APP_ID } from './constants.js'

export function getRegistryDir(): string {
	return path.join(os.tmpdir(), 'tekton-editor-discovery', 'instances')
}
