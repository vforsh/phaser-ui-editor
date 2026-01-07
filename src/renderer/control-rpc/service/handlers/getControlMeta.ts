import type { getControlMetaCommand } from '@tekton/control-rpc-contract/commands/getControlMeta'

import { controlContract, type ControlMethod } from '@tekton/control-rpc-contract'
import { zodToJsonSchema } from 'zod-to-json-schema'

import type { CommandHandler } from '../types'

/**
 * @see {@link getControlMetaCommand} for command definition
 */
export const getControlMeta: CommandHandler<'getControlMeta'> = (_ctx) => async () => {
	const methods = (Object.entries(controlContract) as Array<[ControlMethod, (typeof controlContract)[ControlMethod]]>).map(
		([method, definition]) => {
			const inputSchema = zodToJsonSchema(definition.input, { name: `${method}Input` })
			const outputSchema = zodToJsonSchema(definition.output, { name: `${method}Output` })

			return {
				method,
				group: definition.group,
				description: definition.description,
				inputSchema,
				outputSchema,
			}
		},
	)

	return {
		schemaVersion: 1,
		methods,
		generatedAt: new Date().toISOString(),
	}
}
