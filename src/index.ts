import {createSignal, createEffect, createRoot} from 'solid-js'

export * from 'solid-js'

// These lines should live in @lume/element, but doing that causes Solid to
// exist more than once in node_modules, which causes issues. So because we know
// @lume/element depends on @lume/variable, we stuck these here to avoid the
// duplicate-module issues.
export * from 'solid-js/dom'
import html from 'solid-js/html'
export {html}

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
// TODO Option for autorun() to batch updates into a single update in the next microtask.
// TODO Option for autorun() to skip the first run.
// TODO Option for autorun() to provide which properties caused the re-run.
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

export function reactive(protoOrClassElement: any, name?: string, descriptor?: PropertyDescriptor): any {
	// If used as a newer Babel decorator
	const isDecoratorV2 = arguments.length === 1 && 'kind' in protoOrClassElement
	if (isDecoratorV2) {
		const classElement = protoOrClassElement

		// If used as a class decorator.
		if (classElement.kind === 'class') {
			return {
				...classElement,
				finisher: reactiveClassFinisher,
			}
		}

		// If used as a property or accessor decorator (this isn't intended for
		// methods).
		return {
			...classElement,
			// placement: 'prototype',
			finisher(Class: AnyClass) {
				_reactive(Class.prototype, classElement.key /*, classElement.descriptor*/)
				return classElement.finisher?.(Class) ?? Class
			},
		}
	}

	// Used as a v1 legacy decorator.

	// If used as a class decorator.
	if (arguments.length === 1 && typeof protoOrClassElement === 'function') {
		const Class = protoOrClassElement
		return reactiveClassFinisher(Class)
	}

	// If used as a property or accessor decorator (this isn't intended for
	// methods).
	return _reactive(protoOrClassElement, name!, descriptor)
}

function reactiveClassFinisher(Class: AnyClass) {
	return class extends Class {
		constructor(...args: any[]) {
			super(...args)
			reactify(this, Class)
		}
	}
}

const classToKeys = new WeakMap<AnyClass, string[]>()

function _reactive(prototype: any, name: string, descriptor?: PropertyDescriptor) {
	let keys = classToKeys.get(prototype.constructor)
	if (!keys) classToKeys.set(prototype.constructor, (keys = []))
	keys.push(name)

	const vName = 'v_' + name

	// TODO If prototype already has vName, skip making an accessor.
	// if (prototype[vName] !== undefined) return

	let calledAsPropertyDecorator = false

	// In TypeScript property decorators are not passed a descriptor (unlike decorators on accessors or methods)
	// const isTypeScriptPropertyDecorator = !descriptor
	if (
		// TypeScript legacy decorator case
		!descriptor ||
		// Babel legacy decorator case
		'initializer' in descriptor
	) {
		calledAsPropertyDecorator = true

		// TypeScript legacy decorator case
		if (!descriptor) descriptor = Object.getOwnPropertyDescriptor(prototype, name)

		// In the Babel legacy decorator case, descriptor always exists.
	}

	let originalGet: (() => any) | undefined
	let originalSet: ((v: any) => void) | undefined
	let initialValue: unknown
	let writable: boolean | undefined

	// TODO if there is an inherited accessor, we need to ensure we still call
	// it so that we're extending instead of overriding. Otherwise placing
	// @reactive on a property will break that functionality in those cases.

	if (descriptor) {
		if (descriptor.get || descriptor.set) {
			originalGet = descriptor.get
			originalSet = descriptor.set

			// reactivity requires both
			if (!originalGet || !originalSet) {
				console.warn(
					'The `@reactive` decorator was used on an accessor named "' +
						name +
						'" which had a getter or a setter, but not both. Reactivity on accessors works only when accessors have both get and set. In this case the decorator does not do anything.',
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
		// XXX should we throw an error if descriptor.configurable is false?
		configurable: true,
		get(): unknown {
			// initialValue could be undefined
			// XXX this causes initialValue to be held onto after subsequent values and not collected
			const v = __getReactiveVar(this, vName, initialValue)

			if (originalGet) {
				// track reactivity, but get the value from the original getter
				v()
				return originalGet.call(this)
			}

			return v()
		},
		set(newValue: unknown) {
			const v = __getReactiveVar(this, vName, initialValue)

			if (originalSet) originalSet.call(this, newValue)

			v(newValue)
		},
	}

	// If a TypeScript decorator is called on a property, then returning a descriptor does
	// nothing, so we need to set the descriptor manually. We'll do it for Babel decorators too.
	if (calledAsPropertyDecorator) Object.defineProperty(prototype, name, descriptor)
	// If a TypeScript decorator is called on an accessor or method, then we must return a
	// descriptor in order to modify it, and doing it manually won't work.
	else return descriptor
	// Weird, huh?
	// This will change with updates to the ES decorators proposal, https://github.com/tc39/proposal-decorators
}

type AnyClass = new (...args: any[]) => object

export function reactify<T>(obj: T, props: string[]): typeof obj
export function reactify<C extends AnyClass>(obj: InstanceType<C>, ctor: C): typeof obj
export function reactify(obj: any, propsOrCtor: any) {
	if (typeof propsOrCtor === 'function') {
		const ctor = propsOrCtor
		const o = obj as Record<string, unknown>
		const keys = classToKeys.get(ctor)

		if (keys) {
			for (const key of keys) {
				if (obj.hasOwnProperty(key)) {
					const initialValue = o[key]
					delete o[key]
					o[key] = initialValue
				}
			}
		}

		return obj
	}

	const keys = propsOrCtor

	for (const key of keys) {
		const initialValue = obj[key]
		_reactive(obj, key)
		obj[key] = initialValue
	}

	return obj
}

export const version = '0.1.3'
