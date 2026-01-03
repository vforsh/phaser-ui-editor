/**
 * Creates and returns a new `AbortError` with the supplied message.
 * It imitates exception that is thrown on `fetch()` abortion
 *
 * @param [message] - The error message, which usually comes from `abortSignal.reason`.
 * @returns A `DOMException` with the name 'AbortError'.
 */
export function createAbortError(message?: string) {
	return new DOMException(message || 'Operation aborted', 'AbortError')
}

export function isAbortError(value: unknown): value is DOMException {
	return value instanceof DOMException && value.name === 'AbortError'
}
