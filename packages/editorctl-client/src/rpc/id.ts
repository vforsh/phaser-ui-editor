export function generateId(): string {
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
