type OnceCallback<T extends (...args: any[]) => void> = {
	get wasCalled(): boolean
	signal?: AbortSignal
	call: T
}

export function createOnce<T extends (...args: any[]) => void>(fn: T, signal?: AbortSignal): OnceCallback<T> {
	let result: ReturnType<T> | undefined
	let wasCalled = false
	const callback: OnceCallback<T> = {
		get wasCalled(): boolean {
			return wasCalled
		},
		signal,
		call: ((...args: Parameters<T>) => {
			if (signal?.aborted) {
				return result
			}

			if (wasCalled) {
				return result
			}

			wasCalled = true
			result = fn(...args) as ReturnType<T>
			return result
		}) as unknown as T,
	}

	return callback
}
