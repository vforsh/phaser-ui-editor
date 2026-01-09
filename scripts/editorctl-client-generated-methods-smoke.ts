import { createClient, discoverEditors } from '@tekton/editorctl-client'

async function run(): Promise<void> {
	const editors = await discoverEditors()
	const editor = editors[0]
	if (!editor) {
		throw new Error('No running editors found')
	}

	const client = createClient({ port: editor.wsPort })

	await client.ping()
	await client.openProject({ path: '/Users/vlad/dev/papa-cherry-2' })

	const meta = await client.methods()
	const hasOpenProject = meta.methods.some((entry) => entry.method === 'openProject')
	if (!hasOpenProject) {
		throw new Error('Expected openProject in method list')
	}

	console.log('generated methods smoke: ok')
}

run().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
