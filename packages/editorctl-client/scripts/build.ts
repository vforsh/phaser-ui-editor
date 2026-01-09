import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateControlMethods } from './generate-control-methods'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectPath = path.resolve(__dirname, '..', 'tsconfig.build.json')

async function run(): Promise<void> {
	await generateControlMethods()

	const result = spawnSync('tsc', ['--project', projectPath], { stdio: 'inherit' })
	if (result.status !== null) {
		process.exit(result.status)
	}

	if (result.error) {
		throw result.error
	}
}

run().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
