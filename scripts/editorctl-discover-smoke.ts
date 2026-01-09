import { createClient, discoverEditors } from '@tekton/editorctl-client'
import process from 'node:process'

async function run() {
	const editors = await discoverEditors()
	if (editors.length === 0) {
		throw new Error('No running editors found')
	}

	const editor = editors[0]
	if (!editor) {
		throw new Error('No running editors found')
	}

	process.stdout.write(`discover: ${editors.length} editor(s)\n`)
	process.stdout.write(`picked: ${editor.wsUrl} (pid ${editor.pid})\n`)

	const client = createClient({ port: editor.wsPort })
	const ping = await client.ping()
	process.stdout.write(`ping: ok instanceId=${ping.instanceId} project=${ping.projectPath ?? 'null'}\n`)
}

run().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
	process.exitCode = 1
})
