export type AnyFunction = (...args: any[]) => any

export type Values<T> = T[keyof T]

export type PropsOfType<T extends object, TPropType> = Values<{
	[K in keyof T]: T[K] extends TPropType ? K : never
}>

export type Methods<T extends object> = PropsOfType<T, AnyFunction>

export type IntBool = 0 | 1

export type Prettify<T> = {
	[K in keyof T]: T[K]
} & {} // eslint-disable-line @typescript-eslint/ban-types

/**
 * Mark some of the object fields as optional.
 */
export type PartialSome<T, TKeys extends keyof T> = Partial<Pick<T, TKeys>> & Omit<T, TKeys>

export type NullableValues<T> = {
	[K in keyof T]: T[K] | null
}

/**
 * Recursively traverses a nested object type T and replaces all occurrences of type Target with type Replacement.
 * It uses conditional types and mapped types to iterate over the properties of T and perform the replacement as needed.
 */
export type DeepReplace<T, Target, Replacement> = T extends object
	? {
			[K in keyof T]: T[K] extends Target ? Replacement : DeepReplace<T[K], Target, Replacement>
		}
	: T

/**
 * Type representing the possible return values of the JavaScript typeof operator.
 */
export type TypeofReturnValue =
	| 'undefined'
	| 'object'
	| 'boolean'
	| 'number'
	| 'bigint'
	| 'string'
	| 'symbol'
	| 'function'

export type Constructor<T> = new (...args: any[]) => T
