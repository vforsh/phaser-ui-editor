type Tuple<ErrorType = Error, DataType = unknown> = [error: ErrorType, data: null] | [error: null, data: DataType]

export function tryit<TError = Error, TData = unknown>(fn: () => TData): Tuple<TError, TData> {
	try {
		return [null, fn()]
	} catch (error) {
		return [error as TError, null]
	}
}
