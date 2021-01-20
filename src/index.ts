import * as SOLID from 'solid-js'
import {getGlobal} from './getGlobal.js'

const global = getGlobal() as any
const Solid: typeof SOLID = global.SOLID ?? (global.SOLID = SOLID)
const {createSignal, createEffect, createRoot, untrack: _untrack} = Solid

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

export function reactive(protoOrClassElement: any, name?: string, descriptor?: PropertyDescriptor): any {
	// If used as a newer Babel decorator
	const isDecoratorV2 = arguments.length === 1 && 'kind' in protoOrClassElement
	if (isDecoratorV2) {
		const classElement = protoOrClassElement

		// If used as a class decorator.
		if (classElement.kind === 'class') return {...classElement, finisher: reactiveClassFinisher}

		// If used as a property or accessor decorator (@reactive isn't intended for
		// methods).
		return {
			...classElement,
			finisher(Class: AnyClass) {
				_reactive(Class.prototype, classElement.key)
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
		// This is a flag that other decorators can check, f.e. lume/elements @element decorator.
		static __isReactive__ = true

		constructor(...args: any[]) {
			super(...args)
			reactify(this, Class)
		}
	}
}

const classReactiveProps = new WeakMap<AnyClass, string[]>()

function _reactive(prototype: ObjWithReactifiedProps, propName: string, descriptor?: PropertyDescriptor) {
	let keys = classReactiveProps.get(prototype.constructor)
	if (!keys) classReactiveProps.set(prototype.constructor, (keys = []))
	keys.push(propName)

	const vName = 'v_' + propName

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
		if (!descriptor) descriptor = Object.getOwnPropertyDescriptor(prototype, propName)

		// In the Babel legacy decorator case, descriptor always exists.
	}

	let originalGet: (() => any) | undefined
	let originalSet: ((v: any) => void) | undefined
	let initialValue: unknown

	// TODO if there is an inherited accessor, we need to ensure we still call
	// it so that we're extending instead of overriding. Otherwise placing
	// @reactive on a property will break that functionality in those cases.
	//
	// Right now, originalGet will only be called if it is on the current
	// prototype, but we aren't checking for any accessor that may be inherited.

	if (descriptor) {
		originalGet = descriptor.get
		originalSet = descriptor.set

		if (originalGet || originalSet) {
			// reactivity requires both
			if (!originalGet || !originalSet) {
				console.warn(
					'The `@reactive` decorator was used on an accessor named "' +
						propName +
						'" which had a getter or a setter, but not both. Reactivity on accessors works only when accessors have both get and set. In this case the decorator does not do anything.',
				)
				return
			}

			delete descriptor.get
			delete descriptor.set
		} else {
			initialValue = descriptor.value

			// if it isn't writable, we don't need to make a reactive variable because
			// the value won't change
			if (!descriptor.writable) {
				console.warn(
					'The `@reactive` decorator was used on a property named ' +
						propName +
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
		get: originalGet
			? function(this: any): unknown {
					// track reactivity, but get the value from the original getter

					// XXX this causes initialValue to be held onto even if the original
					// prototype value has changed. In pratice the original prototype
					// values usually never change, and these days people don't normally
					// use prototype values to begin with.
					const v = __getReactiveVar(this, vName, initialValue)
					v()

					return originalGet!.call(this)
			  }
			: function(this: any): unknown {
					const v = __getReactiveVar(this, vName, initialValue)
					return v()
			  },
		set: originalSet
			? function(this: any, newValue: unknown) {
					originalSet!.call(this, newValue)

					const v = __getReactiveVar(this, vName)
					v(newValue)

					// XXX __propsSetAtLeastOnce__ is a Set that tracks which reactive
					// properties have been set at least once. @lume/element uses this
					// to detect if a reactive prop has been set, and if so will not
					// overwrite the value with any value from custom element
					// pre-upgrade.
					if (!this.__propsSetAtLeastOnce__) this.__propsSetAtLeastOnce__ = new Set<string>()
					this.__propsSetAtLeastOnce__.add(propName)
			  }
			: function(this: any, newValue: unknown) {
					const v = __getReactiveVar(this, vName)
					v(newValue)

					if (!this.__propsSetAtLeastOnce__) this.__propsSetAtLeastOnce__ = new Set<string>()
					this.__propsSetAtLeastOnce__.add(propName)
			  },
	}

	if (!prototype.__reactifiedProps__) prototype.__reactifiedProps__ = new Set()
	prototype.__reactifiedProps__.add(propName)

	// If a TypeScript decorator is called on a property, then returning a descriptor does
	// nothing, so we need to set the descriptor manually. We'll do it for Babel decorators too.
	if (calledAsPropertyDecorator) Object.defineProperty(prototype, propName, descriptor)
	// If a TypeScript decorator is called on an accessor or method, then we must return a
	// descriptor in order to modify it, and doing it manually won't work.
	else return descriptor
	// Weird, huh?
	// This will change with updates to the ES decorators proposal, https://github.com/tc39/proposal-decorators

	// Explicit return to satisfy TS noImplicitReturn.
	return
}

function __getReactiveVar<T>(instance: Obj<Variable<T>>, vName: string, initialValue: T = undefined!): Variable<T> {
	// NOTE alternatively, we could use a WeakMap instead of exposing the
	// variable on the instance. We could also use Symbols keys for
	// semi-privacy.
	let v: Variable<T> = instance[vName]

	if (v) return v

	instance[vName] = v = variable<T>(initialValue)

	return v
}

type AnyClass = new (...args: any[]) => object
type AnyClassWithReactiveProps = (new (...args: any[]) => object) & {reactiveProperties?: string[]}

// Define (or unshadow) reactive accessors on obj, which is generally `this`
// inside of a constructor (this is what the documentation prescribes).
export function reactify<T>(obj: T, props: string[]): typeof obj
export function reactify<C extends AnyClass>(obj: InstanceType<C>, ctor: C): typeof obj
export function reactify(obj: Obj, propsOrClass: string[] | AnyClassWithReactiveProps) {
	if (isClass(propsOrClass)) {
		const Class = propsOrClass

		// For properties that were defined as reactive with the @reactive
		// decorator, this deletes properties on the instance that were set as
		// class fields with [[Define]] semantics or before a custom element was
		// upgraded (because such properties override the reactive accessors on
		// the object's prototype), so that these properties' values will
		// trigger the reactive setters.
		let props = classReactiveProps.get(Class)
		if (props) unshadowReactiveAccessors(obj, props)

		props = Class.reactiveProperties
		if (Array.isArray(props)) createReactiveAccessors(obj, props)
	} else {
		const props = propsOrClass
		createReactiveAccessors(obj, props)
	}

	return obj
}

function isClass(obj: unknown): obj is AnyClass {
	return typeof obj == 'function'
}

function unshadowReactiveAccessors(obj: Obj, props: string[]) {
	for (const prop of props) {
		if (obj.hasOwnProperty(prop)) {
			const initialValue = obj[prop]
			delete obj[prop]
			obj[prop] = initialValue
		}
	}
}

// Defines a reactive accessor on obj.
function createReactiveAccessors(obj: ObjWithReactifiedProps, props: string[]) {
	for (const prop of props) {
		if (obj.__reactifiedProps__?.has(prop)) continue

		const initialValue = obj[prop]
		_reactive(obj, prop)
		obj[prop] = initialValue
	}
}

type Obj<T = unknown> = Record<PropertyKey, T> & {constructor: AnyClass}
type ObjWithReactifiedProps<T = unknown> = Obj<T> & {__reactifiedProps__?: Set<string>}

/**
 * When untrack() is used inside an autorun(), dependencies for code inside the
 * untrack() block will not be tracked although the code still runs when the
 * autorun runs. For example:
 *
 * ```js
 * autorun(() => {
 *   // This autorun will re-run whenever someVar changes...
 *   console.log(someVar())
 *
 *   untrack(() => {
 *     // ...but not when otherVar changes, although this logic still fires any
 *     // time the autorun re-runs.
 *     console.log(otherVar())
 *   })
 * })
 * ```
 */
export const untrack = _untrack

export const version = '0.4.2'
