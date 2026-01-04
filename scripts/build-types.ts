/**
 * This script generates TypeScript type declarations (.d.ts files) for the project.
 *
 * It performs the following steps:
 *
 * 1. Reads the tsconfig.dts.json configuration file
 * 2. Runs the TypeScript compiler (tsc) to generate initial .d.ts files
 * 3. Uses dtsroll to bundle all the declarations into a single file
 * 4. Copies the bundled declarations to the output directory as index.d.ts
 *
 * The generated type declarations allow the project to be used as a typed dependency in other TypeScript projects.
 */

import type { CompilerOptions } from 'typescript'

import { execSync } from 'child_process'
import fse from 'fs-extra'
import { format } from 'oxfmt'
import { join } from 'path'
import readline from 'readline'

interface TsConfig {
	compilerOptions?: CompilerOptions
}

const tsconfigPath = join(process.cwd(), 'tsconfig.dts.json')
const tscConfig = fse.readJsonSync(tsconfigPath, 'utf8') as TsConfig
const outDir = tscConfig.compilerOptions!.declarationDir!

const exportsSrcPath = join('src', 'types', 'exports', 'exports.d.ts')
const exportsDtsPath = join(outDir, exportsSrcPath)

// Run tsc to generate initial d.ts files
console.log('Generating type declarations with tsc...')
execSync('npx tsc -p tsconfig.dts.json', { stdio: 'inherit' })

// Run dtsroll to bundle the declarations
console.log('Bundling type declarations with dtsroll...')
execSync(`npx dtsroll ${exportsDtsPath}`, { stdio: 'inherit' })

const exportsContent = await fse.readFile(exportsDtsPath, 'utf8')
const { code: exportsContentPrettyfied, errors } = await format('exports.d.ts', exportsContent, {
	printWidth: 140,
	tabWidth: 4,
	useTabs: true,
	semi: false,
	singleQuote: true,
	trailingComma: 'all',
	quoteProps: 'consistent',
})

if (errors.length > 0) {
	throw new Error(`Failed to format exports.d.ts with oxfmt:\n${errors.join('\n')}`)
}

const exportsFinalPath = 'exports.d.ts'
await fse.outputFile(exportsFinalPath, exportsContentPrettyfied)

console.log(``)
console.log(`Type declarations generated successfully at ${exportsFinalPath}!`)

// Check if --push argument is provided
const shouldPush = process.argv.includes('--push')
if (shouldPush) {
	console.log('Staging, committing and pushing exports.d.ts...')

	// check if there are any changes to exports.d.ts
	const changes = execSync(`git diff ${exportsFinalPath}`, { stdio: 'pipe' })

	// if no changes, exit
	if (!changes.toString().trim()) {
		console.log(`No changes to ${exportsFinalPath}, skipping commit and push...`)
		process.exit(0)
	}

	// Stage exports.d.ts
	execSync(`git add ${exportsFinalPath}`, { stdio: 'inherit' })

	// Create commit with provided message
	execSync(`git commit -m "${await promptCommitMessage()}"`, { stdio: 'inherit' })

	// Push to origin
	execSync('git push origin', { stdio: 'inherit' })

	console.log(`Successfully pushed ${exportsFinalPath} to origin!`)
}

async function promptCommitMessage(): Promise<string> {
	const defaultMessage = 'update exports.d.ts'

	return defaultMessage

	// Create readline interface
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	return new Promise<string>((resolve) => {
		rl.question(`Enter commit message (default: "${defaultMessage}"): `, (answer) => {
			rl.close()
			resolve(answer || defaultMessage)
		})
	})
}
