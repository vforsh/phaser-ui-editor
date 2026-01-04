import { Command } from 'commander'
import process from 'node:process'
import { zodToJsonSchema } from 'zod-to-json-schema'

import type { CommandDefinition } from '../../src/control-rpc/api/ControlApi'
import type { Ctx } from './lib/context'

import { controlContract, isControlMethod, type ControlMethod } from '../../src/control-rpc/api/ControlApi'
import { createValidationError } from './lib/errors'
import { createInputHelpText } from './lib/help/json-schema-input-help'
import { parseJsonObject, parseJsonText } from './lib/json-input'

export function registerContractCommands(program: Command, ctx: Ctx): void {
	const entries = Object.entries(controlContract) as Array<[ControlMethod, CommandDefinition]>

	for (const [method, definition] of entries) {
		const cmd = program
			.command(method)
			.description(definition.description)
			.argument('[input]', 'JSON object params (see below)')
			.action(async (input?: string) => {
				const params = readParamsFromPositionalArg(input)
				const parsedParams = definition.input.parse(params)
				const result = await ctx.rpc.request(method, parsedParams)
				const parsedResult = definition.output.parse(result)
				ctx.output.printJson(parsedResult)
			})

		const inputSchema = zodToJsonSchema(definition.input, {
			name: `${method}Input`,
		})
		cmd.addHelpText('after', createInputHelpText({ method, inputSchema: inputSchema as unknown }))
	}

	program
		.command('call')
		.argument('<method>', 'Control RPC method name')
		.argument('[input]', 'JSON object params')
		.description('Call a control RPC method by name with JSON params as a positional argument')
		.action(async (method: string, input?: string) => {
			const controlMethod = ensureControlMethod(method)
			const definition = controlContract[controlMethod]
			const params = readParamsFromPositionalArg(input)
			const parsedParams = definition.input.parse(params)
			const result = await ctx.rpc.request(controlMethod, parsedParams)
			const parsedResult = definition.output.parse(result)
			ctx.output.printJson(parsedResult)
		})
}

export function registerIntrospectionCommands(program: Command): void {
	program
		.command('methods')
		.description('List available control RPC methods and metadata')
		.action(() => {
			const methods = Object.entries(controlContract).map(([method, definition]) => ({
				method,
				group: definition.group,
				description: definition.description,
			}))
			process.stdout.write(`${JSON.stringify(methods, null, 2)}\n`)
		})

	program
		.command('schema')
		.argument('<method>', 'Control RPC method name')
		.description('Print JSON Schema for a control RPC method input/output')
		.action((method: string) => {
			const controlMethod = ensureControlMethod(method)
			const definition = controlContract[controlMethod]
			const inputSchema = zodToJsonSchema(definition.input, {
				name: `${controlMethod}Input`,
			})
			const outputSchema = zodToJsonSchema(definition.output, {
				name: `${controlMethod}Output`,
			})

			process.stdout.write(`${JSON.stringify({ method: controlMethod, inputSchema, outputSchema }, null, 2)}\n`)
		})
}

function readParamsFromPositionalArg(input: string | undefined): Record<string, unknown> {
	if (input === undefined) {
		return {}
	}

	const raw = parseJsonText(input)
	return parseJsonObject(raw)
}

function ensureControlMethod(method: string): ControlMethod {
	if (!isControlMethod(method)) {
		throw createValidationError(`Unknown method: ${method}`)
	}

	return method
}
