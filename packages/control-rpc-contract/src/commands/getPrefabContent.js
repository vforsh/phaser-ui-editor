import { z } from 'zod'
export const getPrefabContentCommand = {
	group: 'objects',
	description: 'Gets the root prefab content JSON for the currently open prefab.',
	input: z.object({}).strict().describe('Input parameters for getting prefab content (empty)'),
	output: z.unknown().describe('Editable container JSON for the current prefab root'),
}
//# sourceMappingURL=getPrefabContent.js.map
