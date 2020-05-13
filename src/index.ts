import {createSignal, createEffect, createRoot} from 'solid-js'

export * from 'solid-js'
export * from 'solid-js/dom'

export interface ReactiveVariable<T> {
	(value?: undefined): T
	(value: T): void
}

/** Represents a reactive variable. The value is set or gotten depending on passing an arg or no arg. */
export interface Variable<T = any> {
	/** Gets the variable value. */
	(value?: undefined): T
	/** Sets the variable value. */
	(value: T): T
	(value?: T): void | T

	get(): T
	set(value: T): T

	// TODO, for array destructuring convenience
	// [0](): T
	// [1](value: T): T
	// [Symbol.iterator]() {...}
}

function readVariable<T>(this: Variable<T>): T {
	return this()
}
function writeVariable<T>(this: Variable<T>, value: T): T {
	return this(value)
}

/**
 * Create a reactive variable.
 *
 * @example
 * let count = variable(0) // count starts at 0
 * count(1) // set the value of count to 1
 * count(count() + 1) // add 1
 * let currentValue = count() // read the current value
 * console.log(currentValue) // logs "2" to console
 */
// eslint-disable-next-line typescript/explicit-function-return-type
export function variable<T>(value: T) {
	const [get, set] = createSignal<T>(value)

	const variable: Variable<T> = (value?: T) => {
		if (typeof value === 'undefined') return get()
		set(value)
		return value
	}

	// WTF TypeScript, why do I need `any` here.
	variable.get = readVariable.bind(variable as any) as any
	variable.set = writeVariable.bind(variable as any) as any
	// TODO, for array destructuring convenience
	// variable[0] = read.bind(variable as any) as any
	// variable[1] = write.bind(variable as any) as any

	return variable
}

export type Computation = (previousValue?: unknown) => unknown
export type StopFunction = () => void

/**
 * Automatically run a "computation" when any reactive variable used inside the
 * computation has changed. The "computation" is a function passed into
 * autorun().
 *
 * @param {Computation} f - A "computation" to re-run when any of the reactive
 * variables used inside of it change.
 * @return {StopFunction} - Returns a function that can be called to explicitly
 * stop the computation from running, allowing it to be garbage collected.
 */
export function autorun(f: Computation): StopFunction {
	let stop: StopFunction

	createRoot(dispose => {
		stop = dispose
		createEffect(f)
	})

	return stop!
}

function __getReactiveVar<T>(instance: Object, vName: string, initialValue: T = undefined!): ReactiveVariable<T> {
	// NOTE alternatively, we could use a WeakMap instead of exposing the variable on the instance.
	let v: ReactiveVariable<T> = (instance as any)[vName]

	if (v) return v

	// defineProperty to make it non-enumerable, non-writable, non-configurable
	Object.defineProperty(instance, vName, {value: v = variable<T>(initialValue)})

	return v
}

export function reactive<T>(prototype: any, name: string, descriptor?: PropertyDescriptor): any {
	const vName = 'v_' + name

	// property decorators are not passed a prototype (unlike decorators on accessors or methods)
	let calledAsPropertyDecorator = false

	if (!descriptor) {
		calledAsPropertyDecorator = true
		descriptor = Object.getOwnPropertyDescriptor(prototype, name)
	}

	let originalGet: (() => any) | undefined
	let originalSet: ((v: any) => void) | undefined
	let initialValue: T
	let writable: boolean | undefined

	if (descriptor) {
		if (descriptor.get || descriptor.set) {
			originalGet = descriptor.get
			originalSet = descriptor.set

			// reactivity requires both
			if (!originalGet || !originalSet) {
				console.warn(
					'The `@reactive` decorator was used on an accessor named ' +
						name +
						' which had a getter or a setter, but not both. Reactivity on accessors works only when accessors have both get and set.',
				)
				return
			}

			delete descriptor.get
			delete descriptor.set
		} else {
			initialValue = descriptor.value
			writable = descriptor.writable

			// if it isn't writable, we don't need to make a reactive variable because
			// the value won't change
			if (!writable) {
				console.warn(
					'The `@reactive` decorator was used on a property named ' +
						name +
						' that is not writable. Reactivity is not enabled for non-writable properties.',
				)
				return
			}

			delete descriptor.value
			delete descriptor.writable
		}
	}

	descriptor = {
		...descriptor,
		get(): T {
			// initialValue could be undefined
			const v = __getReactiveVar<T>(this, vName, initialValue)

			if (originalGet) {
				// track reactivity, but get the value from the original getter
				v()
				return originalGet.call(this)
			}

			return v()
		},
		set(newValue: T) {
			const v = __getReactiveVar<T>(this, vName, initialValue)

			if (originalSet) originalSet.call(this, newValue)

			v(newValue)
		},
	}

	// If a decorator is called on a property, then returning a descriptor does
	// nothing, so we need to set the descriptor manually.
	if (calledAsPropertyDecorator) Object.defineProperty(prototype, name, descriptor)
	// If a decorator is called on an accessor or method, then we must return a
	// descriptor in order to modify it, and doing it manually won't work.
	else return descriptor
	// Weird, huh?
	// This will change with updates to the ES decorators proposal, https://github.com/tc39/proposal-decorators
}

export const version = '0.0.8'
