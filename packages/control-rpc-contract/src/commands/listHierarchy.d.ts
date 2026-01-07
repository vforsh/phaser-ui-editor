import { z } from 'zod'
export type HierarchyNode = {
	id: string
	name: string
	type: string
	children?: HierarchyNode[]
}
export declare const hierarchyNodeSchema: z.ZodType<HierarchyNode>
export declare const listHierarchyCommand: {
	group: 'hierarchy'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
	output: z.ZodType<HierarchyNode, z.ZodTypeDef, HierarchyNode>
}
//# sourceMappingURL=listHierarchy.d.ts.map
