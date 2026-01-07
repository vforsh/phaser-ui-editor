import type { createPrefabAssetCommand } from '@tekton/control-rpc-contract/commands/createPrefabAsset'

import { mainApi } from '@main-api/main-api'
import { until } from '@open-draft/until'
import { state, stateSchema } from '@state/State'
import md5 from 'blueimp-md5'
import path from 'path-browserify-esm'

import type { AssetTreeItemData } from '../../../types/assets'
import type { CommandHandler } from '../types'

import { buildAssetTree } from '../../../components/assetsPanel/build-asset-tree'
import { createEmptyPrefabFile } from '../../../types/prefabs/PrefabFile'

/**
 * @see {@link createPrefabAssetCommand} for command definition
 */
export const createPrefabAsset: CommandHandler<'createPrefabAsset'> = (_ctx) => async (params) => {
	const projectDir = state.projectDir
	const project = state.project
	if (!projectDir || !project) {
		throw new Error('no project is open')
	}

	const projectRelativePath = normalizeProjectRelativePath(params.path)

	if (projectRelativePath.endsWith('.prefab.json') === false) {
		throw new Error(`createPrefabAsset requires a .prefab.json path (got '${projectRelativePath}')`)
	}

	const absPath = path.join(projectDir, projectRelativePath)

	const parentDir = path.dirname(absPath)
	const parentStat = await mainApi.stat({ path: parentDir })
	if (parentStat.isDirectory === false) {
		throw new Error(`parent directory does not exist: '${projectRelativePath}'`)
	}

	const alreadyExists = await mainApi.exists({ path: absPath })
	if (alreadyExists) {
		throw new Error(`prefab already exists at '${projectRelativePath}'`)
	}

	const prefabFile = params.prefabData ? { content: params.prefabData, assetPack: [] } : createEmptyPrefabFile()

	const { error: writeError } = await until(() => mainApi.writeJson({ path: absPath, content: prefabFile, options: { spaces: '\t' } }))
	if (writeError) {
		throw new Error(`failed to write prefab file: ${String(writeError)}`)
	}

	await refreshProjectAssets(projectDir, project.assetsDir, project.assetsIgnore)

	const createdAssetId = createAssetId({ absPath, name: path.basename(absPath), type: 'prefab' })
	const assetId = findAssetIdByAbsolutePath(state.assets.items as AssetTreeItemData[], absPath) ?? createdAssetId

	return { assetId, path: projectRelativePath }
}

function normalizeProjectRelativePath(raw: string): string {
	const trimmed = raw.trim()
	if (!trimmed) {
		throw new Error('path is required')
	}

	if (path.isAbsolute(trimmed)) {
		throw new Error(`path must be project-relative (got absolute path '${trimmed}')`)
	}

	const normalized = path.normalize(trimmed).replace(/\\/g, '/')
	if (normalized.startsWith('..')) {
		throw new Error(`path must not escape projectDir (got '${trimmed}')`)
	}

	return normalized
}

async function refreshProjectAssets(projectDir: string, assetsDir: string, assetsIgnore: string[]): Promise<void> {
	const assetsDirAbs = path.join(projectDir, assetsDir)
	const assetsGlob = path.join(assetsDirAbs, '**/*')
	const assetsToIgnore = assetsIgnore.map((item) => path.join(assetsDirAbs, item))

	const files = await mainApi.globby({
		patterns: [assetsGlob],
		options: { ignore: assetsToIgnore, markDirectories: true },
	})

	const assetTree = await buildAssetTree(files, assetsDirAbs)
	state.assets.items = stateSchema.shape.assets.shape.items.parse(assetTree)
}

function findAssetIdByAbsolutePath(items: AssetTreeItemData[], absPath: string): string | undefined {
	for (const item of items) {
		if ((item as { path: string }).path === absPath) {
			return (item as { id: string }).id
		}

		const children = (item as any).children ?? (item as any).frames
		if (Array.isArray(children)) {
			const found = findAssetIdByAbsolutePath(children as AssetTreeItemData[], absPath)
			if (found) {
				return found
			}
		}
	}
	return undefined
}

function createAssetId(asset: { absPath: string; name: string; type: string }): string {
	return md5(asset.absPath + '__' + asset.name + '__' + asset.type).slice(0, 10)
}
