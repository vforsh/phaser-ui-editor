// The JSON Schema shape produced by `zod-to-json-schema` includes many variants.
// Keep this intentionally loose; we only read a small, common subset at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonSchema = any

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
		lines.push(`    editorctl ${method}`)

		const example = buildExampleObject(root)
		if (example && Object.keys(example).length > 0) {
			lines.push('')
			lines.push('  Example:')
			lines.push(`    editorctl ${method} '${JSON.stringify(example)}'`)
		}

		return lines.join('\n')
	}

	// Fallback: if the schema isn't an object, point users to `schema`
	lines.push(`  This command expects JSON that matches the input schema.`)
	lines.push('')
	lines.push('  Inspect the full schema with:')
	lines.push(`    editorctl schema ${method}`)
	return lines.join('\n')
}

/**
 * Dereferences a schema that uses `$ref: "#/definitions/<name>"` into its root definition.
 * If the schema doesn't include `$ref`/`definitions`, returns the schema as-is.
 */
function derefRoot(schema: JsonSchema): JsonSchema {
	const defs = schema.definitions
	if (!schema.$ref || !defs) {
		return schema
	}

	return deref(schema, defs, new Set())
}

/**
 * Recursively dereferences `#/definitions/*` `$ref`s.
 *
 * Cycle-safe: uses `seen` to avoid infinite loops if a definition refers to itself.
 */
function deref(schema: JsonSchema, defs: Record<string, JsonSchema>, seen: Set<string>): JsonSchema {
	if (!schema.$ref) {
		return schema
	}

	if (seen.has(schema.$ref)) {
		return schema
	}

	seen.add(schema.$ref)

	const match = schema.$ref.match(/^#\/definitions\/(.+)$/)
	if (!match) {
		return schema
	}

	const defName = match[1]
	const target = defs[defName]
	if (!target) {
		return schema
	}

	return deref(target, defs, seen)
}

/**
 * Best-effort check for whether a JSON Schema represents an object.
 */
function isObjectSchema(schema: JsonSchema): boolean {
	return schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object'))
}

/**
 * Renders a human-readable "Shape" section for object-like JSON input.
 *
 * Output format example:
 * - `- types?: array<string> — Optional list of asset types to include`
 * - `  - allowed: prefab, folder, ...`
 */
function renderObjectShape(schema: JsonSchema, indent: number): string[] {
	const props = schema.properties ?? {}
	const required = new Set(schema.required ?? [])

	const lines: string[] = []
	for (const [key, propSchemaRaw] of Object.entries(props)) {
		const propSchema = schema.definitions ? deref(propSchemaRaw, schema.definitions, new Set()) : propSchemaRaw
		const isRequired = required.has(key)

		const name = isRequired ? key : `${key}?`
		const typeSummary = summarizeType(propSchema)
		const description = propSchema.description ? ` — ${propSchema.description}` : ''

		lines.push(`${' '.repeat(indent)}- ${name}: ${typeSummary}${description}`)

		const allowed = formatAllowedValues(propSchema)
		if (allowed) {
			lines.push(`${' '.repeat(indent + 2)}- allowed: ${allowed}`)
		}
	}

	return lines
}

/**
 * Produces a compact, single-line type summary for a schema node (e.g. `array<string>`).
 * This is intentionally approximate and optimized for CLI help readability.
 */
function summarizeType(schema: JsonSchema): string {
	if (schema.oneOf?.length) {
		return schema.oneOf.map(summarizeType).join(' | ')
	}
	if (schema.anyOf?.length) {
		return schema.anyOf.map(summarizeType).join(' | ')
	}
	if (schema.allOf?.length) {
		return schema.allOf.map(summarizeType).join(' & ')
	}

	if (schema.type === 'array') {
		const itemType = schema.items ? summarizeType(schema.items) : 'unknown'
		return `array<${itemType}>`
	}

	if (Array.isArray(schema.type)) {
		return schema.type.join(' | ')
	}

	if (typeof schema.type === 'string') {
		return schema.type
	}

	if (schema.enum) {
		return 'enum'
	}

	return 'unknown'
}

/**
 * Formats "allowed values" for a schema node (enums and arrays-of-enums).
 */
function formatAllowedValues(schema: JsonSchema): string | undefined {
	if (schema.enum?.length) {
		return formatEnum(schema.enum)
	}

	if (schema.type === 'array' && schema.items?.enum?.length) {
		return formatEnum(schema.items.enum)
	}

	return undefined
}

/**
 * Formats enum values for CLI help and truncates long enums to keep output readable.
 */
function formatEnum(values: unknown[]): string {
	const stringify = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v))
	const rendered = values.map(stringify)

	// Keep help readable for large enums.
	if (rendered.length <= 8) {
		return rendered.join(', ')
	}

	return `${rendered.slice(0, 8).join(', ')}, … (${rendered.length} total)`
}

/**
 * Builds a small example object for CLI help.
 *
 * Strategy:
 * - Prefer required keys; otherwise use the first optional keys.
 * - Include at most 2 keys to keep the example short.
 */
function buildExampleObject(schema: JsonSchema): Record<string, unknown> | undefined {
	const props = schema.properties ?? {}
	const keys = Object.keys(props)
	if (keys.length === 0) {
		return undefined
	}

	// Prefer required keys, otherwise the first optional keys.
	const requiredKeys = schema.required ?? []
	const orderedKeys = requiredKeys.length > 0 ? requiredKeys : keys

	const example: Record<string, unknown> = {}
	for (const key of orderedKeys.slice(0, 2)) {
		const propSchemaRaw = props[key]
		if (!propSchemaRaw) continue
		const propSchema = schema.definitions ? deref(propSchemaRaw, schema.definitions, new Set()) : propSchemaRaw
		example[key] = buildExampleValue(propSchema)
	}

	return example
}

/**
 * Builds an example value for a schema node, prioritizing enums when available.
 */
function buildExampleValue(schema: JsonSchema): unknown {
	if (schema.enum?.length) {
		return schema.enum[0]
	}

	if (schema.type === 'array') {
		if (schema.items?.enum?.length) {
			return schema.items.enum.slice(0, 2)
		}
		return schema.items ? [buildExampleValue(schema.items)] : []
	}

	if (isObjectSchema(schema)) {
		const obj = buildExampleObject(schema)
		return obj ?? {}
	}

	if (schema.type === 'string') return '<string>'
	if (schema.type === 'number' || schema.type === 'integer') return 0
	if (schema.type === 'boolean') return false

	return null
}
