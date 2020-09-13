import {variable, autorun, reactive, reactify} from './index'

describe('@lume/variable', () => {
	describe('variable()', () => {
		it('has gettable and settable values', async () => {
			expect(variable).toBeInstanceOf(Function)
			const num = variable(0)

			// Set the variable's value by passing a value in.
			num(1)

			// Read the variable's value by calling it with no args.
			expect(num()).toBe(1)

			// increment example:
			num(num() + 1)

			expect(num()).toBe(2)

			// An alternative way to set and get the variable's values, if you
			// prefer.
			num.set(3)
			expect(num.get()).toBe(3)

			// The get and set methods are useful, for example, if you'd like to expose only
			// one or the other to external code, but not both (making
			// them write-only or read-only).

			let count: () => number

			// Example: The following block scope exposes only the getter.
			{
				const {get, set} = variable(0)

				// Expose the getter to the outside.
				count = get

				Promise.resolve().then(() => {
					set(1)
					set(count() + 1)
					set(3)
				})
			}

			// On the outside, we can only read the variable's value.
			let expectedCount = -1
			autorun(() => {
				expectedCount++
				expect(count()).toBe(expectedCount)
			})

			await Promise.resolve()

			expect(count()).toBe(3)
			expect(expectedCount).toBe(3)
		})
	})

	describe('autorun()', () => {
		it('re-runs on changes of variables used within, and can be stopped from re-running', () => {
			expect(autorun).toBeInstanceOf(Function)

			const count = variable(0)

			let runCount = 0

			// Runs once immediately, then re-runs any time the variables used
			// within have changed (in this case, only the count() variable).
			const stop = autorun(() => {
				count()
				runCount++
			})

			count(1)
			count(2)

			expect(runCount).toBe(3)

			// Stops the autorun from re-running. It can now be garbage collected.
			stop()

			count(3)
			count(4)

			// The runCount is still the same because the autorun didn't re-run.
			expect(runCount).toBe(3)
		})
	})

	describe('@reactive', () => {
		it('is a function', () => {
			expect(reactive).toBeInstanceOf(Function)
		})

		it('makes class properties reactive, using class and property/accessor decorators', () => {
			@reactive
			class Butterfly {
				@reactive colors = 3

				_wingSize = 2

				@reactive
				get wingSize() {
					return this._wingSize
				}
				set wingSize(s: number) {
					this._wingSize = s
				}
			}

			const b = new Butterfly()

			testButterflyProps(b)
		})

		it('does not prevent superclass constructor from receiving subclass constructor args', () => {
			let called = false

			@reactive
			class Insect {
				constructor(arg: number) {
					expect(arg).toBe(8)
					called = true
				}
			}

			class Butterfly extends Insect {
				constructor(arg: number) {
					super(arg * 2)
				}
			}

			new Butterfly(4)

			expect(called).toBe(true)
		})

		it('makes class properties reactive, using only property/accessor decorators', () => {
			class Butterfly {
				@reactive colors = 3

				_wingSize = 2

				@reactive
				get wingSize() {
					return this._wingSize
				}
				set wingSize(s: number) {
					this._wingSize = s
				}

				constructor() {
					reactify(this, Butterfly)
				}
			}

			const b = new Butterfly()

			testButterflyProps(b)
		})

		it('makes class properties reactive, not using any decorators', () => {
			class Butterfly {
				colors = 3

				_wingSize = 2

				get wingSize() {
					return this._wingSize
				}
				set wingSize(s: number) {
					this._wingSize = s
				}

				constructor() {
					reactify(this, ['colors', 'wingSize'])
				}
			}

			const b = new Butterfly()

			testButterflyProps(b)
		})
	})
})

function testButterflyProps(b: any) {
	let count = 0

	autorun(() => {
		b.colors
		b.wingSize
		count++
	})

	expect(b.colors).toBe(3)
	expect(b.wingSize).toBe(2)
	expect(count).toBe(1)

	b.colors++

	expect(b.colors).toBe(4)
	expect(count).toBe(2)

	b.wingSize++

	expect(b.wingSize).toBe(3)
	expect(count).toBe(3)
}
