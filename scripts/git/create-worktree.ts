import { execSync } from 'child_process'
import fse from 'fs-extra'
import { join } from 'path'
import readline from 'readline'

const WORKTREES_ROOT = '/Users/vlad/dev/phaser-ui-editor-worktrees'
const BASE_BRANCH = 'master'

async function promptBranchName(): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	return new Promise<string>((resolve) => {
		rl.question('Enter branch name: ', (answer) => {
			rl.close()
			resolve(answer.trim())
		})
	})
}

async function main() {
	let branchName = process.argv[2]
	if (!branchName) {
		branchName = await promptBranchName()
	}

	if (!branchName) {
		console.error('Error: Branch name is required.')
		process.exit(1)
	}

	// Transform branch name to a valid directory name by replacing slashes with dashes
	const dirName = branchName.replace(/\//g, '-')
	const worktreePath = join(WORKTREES_ROOT, dirName)

	// Check if branch already exists
	try {
		execSync(`git rev-parse --verify "${branchName}"`, { stdio: 'ignore' })
		console.error(`Error: Branch "${branchName}" already exists.`)
		process.exit(1)
	} catch (_e) {
		// Branch does not exist, which is what we want
	}

	// Check if directory already exists
	if (fse.existsSync(worktreePath)) {
		console.error(`Error: Directory "${worktreePath}" already exists.`)
		process.exit(1)
	}

	console.log(`Creating worktree for branch "${branchName}" at "${worktreePath}"...`)

	try {
		// Ensure worktrees root exists
		fse.ensureDirSync(WORKTREES_ROOT)

		// Create worktree: git worktree add -b <new-branch> <path> <base-branch>
		execSync(`git worktree add -b "${branchName}" "${worktreePath}" "${BASE_BRANCH}"`, { stdio: 'inherit' })

		console.log('\nWorktree created. Running npm ci...')

		// Run npm ci in the new worktree
		execSync('npm ci --legacy-peer-deps', { cwd: worktreePath, stdio: 'inherit' })

		console.log(`\nSuccessfully created worktree and installed dependencies at:`)
		console.log(worktreePath)
	} catch (error) {
		console.error('\nAn error occurred:', error instanceof Error ? error.message : String(error))
		process.exit(1)
	}
}

main()
