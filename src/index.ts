import {getInheritedDescriptor} from 'lowclass'
import {createSignal, createEffect, createRoot, untrack as _untrack} from 'solid-js'

export interface VariableGetter<T> {
	(): T
}

export interface VariableSetter<T> {
	(value: T): T
}

/** Represents a reactive variable. The value is set or gotten depending on passing an arg or no arg. */
export interface Variable<T = any> extends Iterable<VariableGetter<T> | VariableSetter<T>> {
	/** Gets the variable value. */
	(value?: undefined): T
	/** Sets the variable value. */
	(value: T): T
	(value?: T): void | T

	get: VariableGetter<T>
	set: VariableSetter<T>

	// For array destructuring convenience
	[0]: VariableGetter<T>
	[1]: VariableSetter<T>
	[Symbol.iterator](): IterableIterator<VariableGetter<T> | VariableSetter<T>>
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
	const [get, set] = createSignal<T>(value, {equals: false})

	const variable = ((value?: T) => {
		if (typeof value === 'undefined') return get()
		set(() => value)
		return value
	}) as Variable<T>

	// WTF TypeScript, why do I need `any` here.
	const getter = readVariable.bind(variable as any) as VariableGetter<T>
	const setter = writeVariable.bind(variable as any) as VariableSetter<T>

	// For object destructuring convenience.
	variable.get = getter
	variable.set = setter

	// For array destructuring convenience.
	variable[0] = getter
	variable[1] = setter
	variable[Symbol.iterator] = function* () {
		yield variable[0]
		yield variable[1]
	}

	return variable as [VariableGetter<T>, VariableSetter<T>] & Variable<T>
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

export function reactive(protoOrClassElement: any, propName?: string, _descriptor?: PropertyDescriptor): any {
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
			finisher(Class: AnyClassWithReactiveProps) {
				_trackReactiveProperty(Class, classElement.key)

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
	const Class = protoOrClassElement.constructor
	_trackReactiveProperty(Class, propName!)
}

export function _trackReactiveProperty(Class: AnyClassWithReactiveProps, propName: string) {
	if (!Class.reactiveProperties || !Class.hasOwnProperty('reactiveProperties')) Class.reactiveProperties = []
	if (!Class.reactiveProperties.includes(propName)) Class.reactiveProperties.push(propName)
}

function reactiveClassFinisher(Class: AnyClassWithReactiveProps) {
	if (Class.hasOwnProperty('__isReactive__')) return Class

	return class ReactiveDecoratorFinisher extends Class {
		// This is a flag that other decorators can check, f.e. lume/elements @element decorator.
		static __isReactive__: true = true

		constructor(...args: any[]) {
			super(...args)
			reactify(this, Class)
		}
	}
}

function _reactive(obj: ObjWithReactifiedProps, propName: string): void {
	const vName = 'v_' + propName

	// XXX If obj already has vName, skip making an accessor? I think perhaps
	// not, because a subclass might override a property so it is not reactive,
	// and a further subclass might want to make it reactive again in which
	// case returning early would cause the subclass subclass's property not to
	// be reactive.
	// if (obj[vName] !== undefined) return

	let descriptor: PropertyDescriptor | undefined = getInheritedDescriptor(obj, propName)

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
		configurable: true,
		enumerable: true,
		...descriptor,
		get: originalGet
			? function (this: any): unknown {
					// track reactivity, but get the value from the original getter

					// XXX this causes initialValue to be held onto even if the original
					// prototype value has changed. In pratice the original prototype
					// values usually never change, and these days people don't normally
					// use prototype values to begin with.
					const v = __getReactiveVar(this, vName, initialValue)
					v()

					return originalGet!.call(this)
			  }
			: function (this: any): unknown {
					const v = __getReactiveVar(this, vName, initialValue)
					return v()
			  },
		set: originalSet
			? function (this: any, newValue: unknown) {
					originalSet!.call(this, newValue)

					const v = __getReactiveVar(this, vName)
					v(newValue)

					// __propsSetAtLeastOnce__ is a Set that tracks which reactive
					// properties have been set at least once. @lume/element uses this
					// to detect if a reactive prop has been set, and if so will not
					// overwrite the value with any value from custom element
					// pre-upgrade.
					if (!this.__propsSetAtLeastOnce__) this.__propsSetAtLeastOnce__ = new Set<string>()
					this.__propsSetAtLeastOnce__.add(propName)
			  }
			: function (this: any, newValue: unknown) {
					const v = __getReactiveVar(this, vName)
					v(newValue)

					if (!this.__propsSetAtLeastOnce__) this.__propsSetAtLeastOnce__ = new Set<string>()
					this.__propsSetAtLeastOnce__.add(propName)
			  },
	}

	if (!obj.__reactifiedProps__) obj.__reactifiedProps__ = new Set()
	obj.__reactifiedProps__.add(propName)

	Object.defineProperty(obj, propName, descriptor)
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
type AnyClassWithReactiveProps = (new (...args: any[]) => object) & {
	reactiveProperties?: string[]
	__isReactive__?: true
}

// Define (or unshadow) reactive accessors on obj, which is generally `this`
// inside of a constructor (this is what the documentation prescribes).
export function reactify<T>(obj: T, props: string[]): typeof obj
export function reactify<C extends AnyClass>(obj: InstanceType<C>, ctor: C): typeof obj
export function reactify(obj: Obj, propsOrClass: string[] | AnyClassWithReactiveProps) {
	if (isClass(propsOrClass)) {
		const Class = propsOrClass

		// let props = classReactiveProps.get(Class)
		// if (props) unshadowReactiveAccessors(obj, props)
		// props = Class.reactiveProperties

		const props = Class.reactiveProperties
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

/**
 * Allow two reactive variables to depend on each other's values, without
 * causing an infinite loop.
 */
export function circular<Type>(
	first: VariableGetter<Type>,
	setFirst: (v: Type) => void,
	second: VariableGetter<Type>,
	setSecond: (v: Type) => void,
): StopFunction {
	let initial = true

	const stop1 = autorun(() => {
		const v = first()
		if (initial && !(initial = false)) setSecond(v)
		else initial = true
	})

	const stop2 = autorun(() => {
		const v = second()
		if (initial && !(initial = false)) setFirst(v)
		else initial = true
	})

	return function stop() {
		stop1()
		stop2()
	}
}

export const version = '0.7.0'
