export function getGlobal(): Window {
	if (typeof globalThis !== 'undefined') return globalThis as any
	else if (typeof window !== 'undefined') return window
	else if (typeof global !== 'undefined') return global as any
	else return Function('return this')()
}
