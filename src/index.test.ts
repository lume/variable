import {variable, autorun, reactive, reactify} from './index'

describe('@lume/variable', () => {
	it('variable() needs testing', () => {
		expect(variable).toBeInstanceOf(Function)
	})

	it('autorun() needs testing', () => {
		expect(autorun).toBeInstanceOf(Function)
	})

	describe('@reactive', () => {
		it('is a function', () => {
			expect(reactive).toBeInstanceOf(Function)
		})

		it('makes class properties reactive, with class decorator', () => {
			@reactive
			class Butterfly {
				@reactive colors = 3
			}

			const b = new Butterfly()

			let count = 0

			autorun(() => {
				b.colors
				count++
			})

			expect(b.colors).toBe(3)
			expect(count).toBe(1)

			b.colors++

			expect(b.colors).toBe(4)
			expect(count).toBe(2)
		})

		it('makes class properties reactive, without class decorator', () => {
			class Butterfly {
				@reactive colors = 3

				constructor() {
					reactify(this, Butterfly)
				}
			}

			const b = new Butterfly()

			let count = 0

			autorun(() => {
				b.colors
				count++
			})

			expect(b.colors).toBe(3)
			expect(count).toBe(1)

			b.colors++

			expect(b.colors).toBe(4)
			expect(count).toBe(2)
		})

		it('makes class properties reactive, without any decorators', () => {
			class Butterfly {
				colors = 3

				constructor() {
					reactify(this, ['colors'])
				}
			}

			const b = new Butterfly()

			let count = 0

			autorun(() => {
				b.colors
				count++
			})

			expect(b.colors).toBe(3)
			expect(count).toBe(1)

			b.colors++

			expect(b.colors).toBe(4)
			expect(count).toBe(2)
		})
	})
})
