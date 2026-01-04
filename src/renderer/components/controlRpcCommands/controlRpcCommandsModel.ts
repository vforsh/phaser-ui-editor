import { useMemo } from 'react'
import { zodToJsonSchema } from 'zod-to-json-schema'

import { buildExampleObject, derefRoot, isObjectSchema, renderObjectShape } from '../../../shared/json-schema/schemaShape'
import { COMMAND_GROUPS, controlContract, type ControlMethod } from '../../control-rpc/api/ControlApi'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonSchema = any

export type ControlRpcGroup = keyof typeof COMMAND_GROUPS | 'all'

export interface ControlRpcCommandEntry {
	method: ControlMethod
	group: ControlRpcGroup
	description: string
	inputSchema: JsonSchema
	outputSchema: JsonSchema
	inputShapeLines: string[]
	outputShapeLines: string[]
}

export interface GroupInfo {
	id: ControlRpcGroup
	label: string
	count: number
}

/**
 * Derives enriched command entries from the controlContract.
 * Memoized since controlContract is static.
 */
export function useControlRpcCommandsModel() {
	return useMemo(() => {
		const entries: ControlRpcCommandEntry[] = []
		const groupCounts = new Map<ControlRpcGroup, number>()

		// Initialize group counts
		groupCounts.set('all', 0)
		for (const group of Object.keys(COMMAND_GROUPS) as ControlRpcGroup[]) {
			groupCounts.set(group, 0)
		}

		for (const [method, def] of Object.entries(controlContract) as Array<[ControlMethod, (typeof controlContract)[ControlMethod]]>) {
			const inputSchema = zodToJsonSchema(def.input, { name: `${method}Input` })
			const outputSchema = zodToJsonSchema(def.output, { name: `${method}Output` })

			const inputRoot = derefRoot(inputSchema)
			const outputRoot = derefRoot(outputSchema)

			const inputShapeLines = isObjectSchema(inputRoot) ? renderObjectShape(inputRoot, 0) : []
			const outputShapeLines = isObjectSchema(outputRoot) ? renderObjectShape(outputRoot, 0) : []

			entries.push({
				method,
				group: def.group,
				description: def.description,
				inputSchema,
				outputSchema,
				inputShapeLines,
				outputShapeLines,
			})

			// Update counts
			groupCounts.set('all', (groupCounts.get('all') ?? 0) + 1)
			groupCounts.set(def.group, (groupCounts.get(def.group) ?? 0) + 1)
		}

		// Build group info list (excluding 'all')
		const groups: GroupInfo[] = (Object.keys(COMMAND_GROUPS) as Array<keyof typeof COMMAND_GROUPS>).map((id) => ({
			id: id as ControlRpcGroup,
			label: COMMAND_GROUPS[id].charAt(0).toUpperCase() + COMMAND_GROUPS[id].slice(1),
			count: groupCounts.get(id as ControlRpcGroup) ?? 0,
		}))

		return { entries, groups }
	}, [])
}

/**
 * Filters entries by group and search query.
 */
export function filterEntries(
	entries: ControlRpcCommandEntry[],
	activeGroup: ControlRpcGroup,
	searchQuery: string,
): ControlRpcCommandEntry[] {
	let filtered = entries

	// Filter by group
	if (activeGroup !== 'all') {
		filtered = filtered.filter((entry) => entry.group === activeGroup)
	}

	// Filter by search query
	if (searchQuery.trim()) {
		const query = searchQuery.toLowerCase().trim()
		filtered = filtered.filter((entry) => {
			const groupLabel = entry.group in COMMAND_GROUPS ? COMMAND_GROUPS[entry.group as keyof typeof COMMAND_GROUPS] : entry.group
			return (
				entry.method.toLowerCase().includes(query) ||
				entry.description.toLowerCase().includes(query) ||
				groupLabel.toLowerCase().includes(query)
			)
		})
	}

	return filtered
}
