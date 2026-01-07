// The JSON Schema shape produced by `zod-to-json-schema` includes many variants.
// Keep this intentionally loose; we only read a small, common subset at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonSchema = any

import { buildExampleObject, derefRoot, isObjectSchema, renderObjectShape } from '@tekton/json-schema-utils'

type CreateInputHelpParams = {
	/**
	 * Control RPC method name (used in examples and `editorctl schema <method>` hints).
	 */
	method: string
	/**
	 * The JSON Schema produced by `zod-to-json-schema` for the method's input.
	 * Intentionally typed as `unknown` because `zod-to-json-schema`'s TS types are broad
	 * and we only inspect a small runtime subset.
	 */
	inputSchema: unknown
}

/**
 * Creates a multi-line help section describing the positional JSON `input` argument for a method.
 *
 * - Dereferences `#/definitions/*` when the schema is `$ref`-based.
 * - For object inputs, prints a field-by-field "Shape" view.
 * - Adds a short example command where possible.
 */
export function createInputHelpText({ method, inputSchema }: CreateInputHelpParams): string {
	const root = derefRoot(inputSchema as JsonSchema)
	const lines: string[] = []

	lines.push('')
	lines.push('Input (JSON):')

	if (root.description) {
		lines.push(`  ${root.description}`)
	}

	// Common case: object params
	if (isObjectSchema(root)) {
		const shapeLines = renderObjectShape(root, 2)
		if (shapeLines.length > 0) {
			lines.push('  Shape:')
			lines.push(...shapeLines)
		} else {
			lines.push('  Shape: {} (no params)')
		}

		lines.push('')
		lines.push('  Omit input to use {}:')
		lines.push(`    editorctl call ${method}`)

		const example = buildExampleObject(root)
		if (example && Object.keys(example).length > 0) {
			lines.push('')
			lines.push('  Example:')
			lines.push(`    editorctl call ${method} '${JSON.stringify(example)}'`)
		}

		return lines.join('\n')
	}

	// Fallback: if the schema isn't an object, point users to `schema`
	lines.push('  This command expects JSON that matches the input schema.')
	lines.push('')
	lines.push('  Inspect the full schema with:')
	lines.push(`    editorctl schema ${method}`)
	return lines.join('\n')
}
