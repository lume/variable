# @lume/variable

Make reactive variables and react to their changes.

#### `npm install @lume/variable --save`

## React to changes in reactive variables

In the following we make a reactive variable `count`, increment its value every
second, and re-run a piece of code that logs the value to the console
on each change:

```js
import {variable, autorun} from '@lume/variable'

const count = variable(0)

setInterval(() => count(count() + 1), 1000)

autorun(() => {
	// Log the count variable any time it changes.
	console.log(count())
})
```

The function passed into `autorun` (sometimes referred to as "an autorun" or "a
computation") automatically re-runs every second due to `count` being
incremented every second.

Calling `count()` gets the current value, while calling `count(123)` with an
arg sets the value. Thus `count(count() + 1)` increments the value.

Any reactive variables used inside an autorun function are registered (or
"tracked") as "dependencies" by `autorun`, then any time those dependencies
change, the autorun re-runs.

We call this "dependency-tracking reactivity".

An autorun with multiple variables accessed inside of it will re-run any time
any of the accessed variables change:

```js
autorun(() => {
	// Log these variables every time any of them change.
	console.log(firstName(), lastName(), age(), hairColor())
})
```

`autorun`s can be grouped in any way we like:

```js
autorun(() => {
	// This re-runs only when firstName or lastName have changed.
	console.log(firstName(), lastName())
})

autorun(() => {
	// This re-runs only when age or hairColor have changed.
	console.log(age(), hairColor())
})
```

If we wish to stop an `autorun` from re-running, we can call its returned stop
function (note, this is not necessary if we or the JS engine no longer have
references to any of the reactive variables that are dependencies of the
`autorun`, and in that case everything will be garbage collected and will no
longer re-run):

```js
import {variable, autorun} from '@lume/variable'

const count = variable(0)

setInterval(() => count(count() + 1), 1000)

const stop = autorun(() => {
	// Log the count variable any time it changes.
	console.log(count())
})

// Stop the autorun (and therefore no more logging will happen) after 5 seconds:
setTimeout(stop, 5000)
```

## Power and Simplicity

Learn how dependency-tracking reactivity makes your code cleaner and more
concise compared to another more common pattern.

<details><summary>Click to expand.</summary>

<br />

Reactive computations (autoruns) are nice because it doesn't matter how we
group our variables (dependencies) within computations. What matters is we
write what we care about (expressions using our variables) without having
to think about how to wire reactivity up.

With an event-based pattern, in contrast, our code would be more verbose and less
convenient.

Looking back at our simple autorun for logging several variables,

```js
autorun(() => {
	// Log these variables every time any of them change.
	console.log(firstName(), lastName(), age(), hairColor())
})
```

we will see that writing the same thing with some sort of event pattern is more verbose:

```js
function log() {
	// Log these variables every time any of them change.
	console.log(firstName.value, lastName.value, age.value, hairColor.value)
}

// We need to also register an event handler for each value we care to react to:
firstName.on('change', log)
lastName.on('change', log)
age.on('change', log)
hairColor.on('change', log)
```

With this hypothetical event pattern, we had to share our logging function with
each event emitter in order to wire up the reactivity, having us write more
code. Using `autorun` was simpler and less verbose.

Now let's say we want to add one more item to the `console.log` statement.

Here is what that looks like with an autorun:

```js
autorun(() => {
	// Log these variables every time any of them change.
	console.log(firstName(), lastName(), age(), hairColor(), favoriteFood())
})
```

With an event emitter pattern, there is more to do:

```js
function log() {
	// Log these variables every time any of them change.
	console.log(firstName.value, lastName.value, age.value, hairColor.value, favoriteFood.value)
}

firstName.on('change', log)
lastName.on('change', log)
age.on('change', log)
hairColor.on('change', log)
favoriteFood.on('change', log) // <-------- Don't forget to add this line too!
```

Not only is the event pattern more verbose, but it is more error prone because
we can forget to register the event handler: we had to modify the code in two
places in order to add logging of the `favoriteFood` value.

Here's where it gets interesting!

Reactive computations allow us to decouple the reactivity implementation from
places where we need reactivity, and to focus on the code we want to write.

Let's say we want to make a class with properties, and abserve any of them when
they change.

First, let's use a familiar event pattern to show the less-than-ideal scenario first:

```js
// Let's say this is in a lib called 'events'.
class EventEmitter {
	addEventHandler(eventName, fn) {
		/*...use imagination here...*/
	}
	removeEventHandler(eventName, fn) {
		/*...use imagination here...*/
	}
	emit(eventName, data) {
		/*...use imagination here...*/
	}
}
```

Now let's use `EventEmitter` to make a class whose poperties we can observe the
changes of. In the following class, we'll make getter/setter pairs so that any
time a setter is used to set a value, it will emit a "change" event.

```js
import {EventEmitter} from 'events'

// We need to extend from EventEmitter (or compose it inside the class, but the amount
// of code would be similar).
class Martian extends EventEmitter {
	_firstName = ''
	get firstName() {
		return this._firstName
	}
	set firstName(v) {
		this._firstName = v
		this.emit('change', 'firstName') // Emit any time the property is set.
	}

	_lastName = ''
	get lastName() {
		return this._lastName
	}
	set lastName(v) {
		this._lastName = v
		this.emit('change', 'lastName')
	}

	_age = 0
	get age() {
		return this._age
	}
	set age(v) {
		this._age = v
		this.emit('change', 'age')
	}

	_hairColor = ''
	get hairColor() {
		return this._hairColor
	}
	set hairColor(v) {
		this._hairColor = v
		this.emit('change', 'hairColor')
	}

	_favoriteFood = ''
	get favoriteFood() {
		return this._favoriteFood
	}
	set favoriteFood(v) {
		this._favoriteFood = v
		this.emit('change', 'favoriteFood')
	}
}

const martian = new Martian()
```

The following shows how we would react to changes in three of the five properties of a `Martian`:

```js
martian.addEventHandler('change', property => {
	if (['firstName', 'hairColor', 'favoriteFood'].includes(property)) {
		// Log these three variables every time any of the three change.
		console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
	}
})
```

It works, but we can still make this better while still using the same event
pattern.

Let's say we want to make it more efficient: instead of all event handlers
being subscribed to a single `change` event (because Martians probably have
lots and lots of properties) and filtering for the properties we care to
observe, we can choose specific event names for each property and subscribe
handlers to specific property events:

```js
import {EventEmitter} from 'events'

class Martian extends EventEmitter {
	_firstName = ''
	get firstName() {
		return this._firstName
	}
	set firstName(v) {
		this._firstName = v
		this.emit('change:firstName') // Emit a specific event for the firstName property.
	}

	_lastName = ''
	get lastName() {
		return this._lastName
	}
	set lastName(v) {
		this._lastName = v
		this.emit('change:lastName') // Similar for the lastName property.
	}

	_age = 0
	get age() {
		return this._age
	}
	set age(v) {
		this._age = v
		this.emit('change:age') // And so on.
	}

	_hairColor = ''
	get hairColor() {
		return this._hairColor
	}
	set hairColor(v) {
		this._hairColor = v
		this.emit('change:hairColor')
	}

	_favoriteFood = ''
	get favoriteFood() {
		return this._favoriteFood
	}
	set favoriteFood(v) {
		this._favoriteFood = v
		this.emit('change:favoriteFood')
	}
}
```

We can now avoid the overhead of the array filtering we previously had with the `.includes` check:

```js
const martian = new Martian()

const onChange = () => {
	// Log these three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}

martian.addEventHandler('change:firstName', onChange)
martian.addEventHandler('change:hairColor', onChange)
martian.addEventHandler('change:favoriteFood', onChange)
```

This is better than before because now if other properties besides the ones
we've subscribed to change, the event pattern won't be calling our function
needlessly and we won't be doing property name checks every time.

We can still do better with the event pattern! (Spoiler: it won't get as clean
as with `autorun` below, which we'll get to next.)

We can come up with an automatic event-wiring mechanism. It could look
something like the following:

```js
import {EventEmitter, WithEventProps} from 'events'

// Imagine `WithEventProps` wires up events for any properties specified in a
// static `eventProps` field:
const Martian = WithEventProps(
	class Martian extends EventEmitter {
		static eventProps = ['firstName', 'lastName', 'age', 'hairColor', 'favoriteFood']

		firstName = ''
		lastName = ''
		age = 0
		hairColor = ''
		favoriteFood = ''
	},
)

// Listen to events as before:

const martian = new Martian()

const onChange = () => {
	// Log these three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}

martian.addEventHandler('change:firstName', onChange)
martian.addEventHandler('change:hairColor', onChange)
martian.addEventHandler('change:favoriteFood', onChange)
```

That is a lot shorter already, but we can still do better! (It still won't be
as simple as with dependency-tracking reactivity, which is coming up.)

We can make the event pattern more
[DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) ("Don't Repeat
Yourself") using decorators to allow us to be less repetitive:

```js
import {EventEmitter, emits} from 'events'

// Imagine this `@emits` decorator wires up an event for each decorated property.
@emits
class Martian extends EventEmitter {
	@emits firstName = ''
	@emits lastName = ''
	@emits age = 0
	@emits hairColor = ''
	@emits favoriteFood = ''
}

// Listen to events as before:

const martian = new Martian()

const onChange = () => {
	// Log these three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}

martian.addEventHandler('change:firstName', onChange)
martian.addEventHandler('change:hairColor', onChange)
martian.addEventHandler('change:favoriteFood', onChange)
```

This is better than before because now we didn't have to repeat the property
names twice, reducing the chance of errors from mismatched names. Instead we
labeled them all with a decorator.

---

We can still do better! 🤯

With LUME's reactive variables we can further decouple a class's implementation from
the reactivity mechanism and make things cleaner.

We can re-write the previous non-decorator example (and still not using
decorators) so that our class does not need to extend from a particular base
class to inherit a reactivity implementation:

```js
import {variable, autorun} from '@lume/variable'

// This class does not extend from any base class. Instead, reactive variables
// are defined inside the class.
class Martian {
	firstName = variable('')
	lastName = variable('')
	age = variable(0)
	hairColor = variable('')
	favoriteFood = variable('')
}

const martian = new Martian()

autorun(() => {
	// Log these three variables every time any of the three change.
	console.log(martian.firstName(), martian.hairColor(), martian.favoriteFood())
})
```

This is better than before because the reactivity is not an inherent part of
our class hierarchy, instead being a feature of the reactive variables. We can
use this form of reactivity in our `Matrian` class or in any other class
without having class inheritance requirements, and other developers do not have
to make subclasses of our classes just to have reactivity.

Plus, we did not need to subscribe an event listener to specific
events like we did earlier with the `addEventHandler` calls. Instead, we
wrapped our function with `autorun` and it became a "reactive computation" with
the ability to re-run when its dependencies (the reactive variables used within
it) change.

...We can still do better! 🤯...

Using LUME's decorators, the experience is as good as it gets:

```js
import {variable, autorun, reactive} from '@lume/variable'

// Now we mark the class and properties as reactive with the `@reactive` decorator.
@reactive
class Martian {
	@reactive firstName = ''
	@reactive lastName = ''
	@reactive age = 0
	@reactive hairColor = ''
	@reactive favoriteFood = ''

	// This property is not reactive, as it is not marked with `@reactive`.
	cryogenesis = false
}

const martian = new Martian()

autorun(() => {
	// Log these four variables every time any of the first three change. Note
	// that this will not automatically rerun when cryogenesis changes because cryogenesis
	// is not reactive.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood, martian.cryogenesis)
})
```

This is better than before because now we can use the properties like regular
properties instead of having to call them as functions to read their values
like we had to in the prior example. We can write `this.age` instead of
`this.age()` for reading a value, and `this.age = 10` instead of `this.age(10)`
for writing a value.

Dependency-tracking reactivity makes things nice and concise.

</details>

## API

### `const myVar = variable(value)`

Creates a reactive variable with an initial `value`. The return value is a function that

- when called with no argument, returns the reactive variable's value, f.e. `myVar()`.
- when called with an argument, sets the reactive variable's value, f.e. `myVar(newValue)`.

```js
const foo = variable(false)
const bar = variable(123)
```

### `const stop = autorun(fn)`

Takes a function `fn` and immediately runs it, while tracking any reactive
variables that were used inside of it as dependencies. Any time those variables
change, `fn` is executed again. Each time `fn` re-runs, dependencies are
re-tracked, which means that conditional branching within `fn` can change which
dependencies will re-run `fn` next time.

`autorun` returns a `stop` function that when called causes `fn` never to be
automatically executed again. This is useful when you no longer care about some
variables.

```js
autorun(() => {
	if (foo()) doSomethingWith(bar())
})
```

### `@reactive`

A decorator that makes properties in a class reactive. Besides decorating
properties with the decorator, also be sure to decorate the class that shall
have reactive variable with the same decorator as well.

```js
@reactive
class Car {
	@reactive engineOn = false
	@reactive sound = 'vroom'
}

const car = new Car()

autorun(() => {
	// Any time the car turns on, it makes a sound.
	if (car.engineOn) console.log(car.sound)
})
```
