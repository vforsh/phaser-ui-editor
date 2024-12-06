export function createCounter(start = 0): () => number {
	return (() => {
		let a = start
		return () => a++
	})()
}
