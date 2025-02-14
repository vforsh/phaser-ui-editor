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

import { execSync } from 'child_process'
import fse from 'fs-extra'
import { join } from 'path'
import type { CompilerOptions } from 'typescript'

interface TsConfig {
	compilerOptions?: CompilerOptions
}

const tsconfigPath = join(process.cwd(), 'tsconfig.dts.json')
const tscConfig = fse.readJsonSync(tsconfigPath, 'utf8') as TsConfig
const outDir = tscConfig.compilerOptions!.declarationDir!

const exportsPath = join('src', 'types', 'exports', 'exports.d.ts')
const exportsDtsPath = join(outDir, exportsPath)

// Run tsc to generate initial d.ts files
console.log('Generating type declarations with tsc...')
execSync('npx tsc -p tsconfig.dts.json', { stdio: 'inherit' })

// Run dtsroll to bundle the declarations
console.log('Bundling type declarations with dtsroll...')
execSync(`npx dtsroll ${exportsDtsPath}`, { stdio: 'inherit' })

const exportsContent = await fse.readFile(exportsDtsPath, 'utf8')
const indexPath = 'exports.d.ts'
await fse.outputFile(indexPath, exportsContent)

console.log(``)
console.log(`Type declarations generated successfully at ${indexPath}!`)

// TODO commit, tag and push to github
