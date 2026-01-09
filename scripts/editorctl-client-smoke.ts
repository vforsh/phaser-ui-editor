import { createClient, discoverEditors } from '@tekton/editorctl-client'
import process from 'node:process'

const port = Number.parseInt(process.env.EDITOR_CONTROL_WS_PORT ?? '17870', 10)
const projectPath = process.env.EDITORCTL_PROJECT_PATH

async function run() {
	const editors = await discoverEditors()
	if (editors.length === 0) {
		throw new Error('No running editors found')
	}

	const selected = editors.find((entry) => entry.wsPort === port)
	if (!selected) {
		throw new Error(`No running editor found on port ${port}`)
	}

	const client = createClient({ port: selected.wsPort })

	const meta = await client.methods()
	process.stdout.write(`methods: ${meta.methods.length}\n`)

	const schema = await client.schema('openProject')
	process.stdout.write(`schema openProject: ${schema.inputSchema ? 'ok' : 'missing'}\n`)

	if (projectPath) {
		await client.openProject({ path: projectPath })
		process.stdout.write('openProject: ok\n')
	}
}

run().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
	process.exitCode = 1
})
