import { connect } from '@tekton/editorctl-client'

async function run(): Promise<void> {
	// Use connect() to validate happy path ergonomics
	const { client } = await connect()

	await client.ping()
	await client.openProject({ path: '/Users/vlad/dev/papa-cherry-2' })

	const meta = await client.getMeta()
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
