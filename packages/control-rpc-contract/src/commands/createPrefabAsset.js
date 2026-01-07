import { z } from 'zod'
export const createPrefabAssetCommand = {
	group: 'assets',
	description: 'Creates a new prefab asset file on disk at the given project-relative path, and returns its asset id.',
	input: z
		.object({
			path: z.string().min(1).describe('Project-relative path to the new prefab file (must end with `.prefab.json`)'),
			prefabData: z.unknown().optional().describe('Optional prefab content JSON to seed the new file'),
		})
		.strict()
		.describe('Input parameters for creating a prefab asset'),
	output: z
		.object({
			assetId: z.string().min(1).describe('Unique identifier of the created prefab asset'),
			path: z.string().min(1).describe('Project-relative path to the created prefab file'),
		})
		.strict()
		.describe('Response containing the created prefab asset id and path'),
}
//# sourceMappingURL=createPrefabAsset.js.map
