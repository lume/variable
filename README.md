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

The function (sometimes referred to as "an autorun" or "a computation") passed
into autorun automatically re-runs every second due to `count` being
incremented every second.

Calling `count()` gets the current value, while calling `count(123)` with an
arg sets the value. Thus `count(count() + 1)` increments the value.

This works because the `autorun` registers any reactive variables used inside
the function as "dependencies", Any time a dependency in an autorun changes,
the autorun re-runs the fun.

An autorun with multiple variables accessed inside of it will re-run any time
any of the accessed variables change:

```js
autorun(() => {
	// Log the variables every time any of them change.
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

We can stop an `autorun` from re-running, if we need to, by calling its
returned stop function (note, this is not necessary if we or the JS engine no
longer have references to any of the `autorun`'s dependencies, and in that case
everything will be garbage collected and will no longer re-run):

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

Reactive computations (autoruns) are nice because it doesn't matter how we
group variables (dependencies). What matters is we write what we care about
(expressions using our variables) and don't have to think much about how to
wire things up.

For example, an event pattern, in contrast, can be more verbose and less
convenient. Here's the same thing with some sort of event pattern:

```js
function log() {
	// Log the variables every time any of them change.
	console.log(firstName.value, lastName.value, age.value, hairColor.value)
}

firstName.on('change', log)
lastName.on('change', log)
age.on('change', log)
hairColor.on('change', log)
```

It isn't as clean. With an event pattern we had to figure how to share the
function to wire it up to each event emitter.

Let's say we want to add one more item to the console.log statement. Here is
how it would be with an autorun:

```js
autorun(() => {
	// Log the variables every time any of them change.
	console.log(firstName(), lastName(), age(), hairColor(), favoriteFood())
})
```

In contrast, here's how it would be with an event pattern:

```js
function log() {
	// Log the variables every time any of them change.
	console.log(firstName.value, lastName.value, age.value, hairColor.value, favoriteFood.value)
}

firstName.on('change', log)
lastName.on('change', log)
age.on('change', log)
hairColor.on('change', log)
favoriteFood.on('change', log) // Don't forget to add this line too!
```

We can see the event pattern is more error prone (we can forget to register the
event handler).

Here's where it gets interesting.

Reactive computations allow us to decouple the reactivity implementation from
places where we need reactivity, and to focus on the code we want to write.

Let's say we want to make a class with properties, and abserve any of them when
they change.

First, let's try a tried-and-true event pattern:

```js
// Let's say this is in a lib called 'events'.
class EventEmitter {
	addEventHandler() {
		/*...imagination...*/
	}
	removeEventHandler() {
		/*...imagination...*/
	}
	emit() {
		/*...imagination...*/
	}
}
```

Now let's use it to make a class whose poperties we can observe the changes of.

```js
import {EventEmitter} from 'events'

// We have to extend from EventEmitter (or we could compose it, but the amount
// of code would be similar).
class Martian extends EventEmitter {
	_firstName = ''
	get firstName() {
		return this._firstName
	}
	set firstName(v) {
		this._firstName = v
		this.emit('change', 'firstName')
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

Now let's react to changes in three of the five properties of a `Martian`:

```js
martian.addEventHandler('change', property => {
	if (['firstName', 'hairColor', 'favoriteFood'].includes(property)) {
		// Log the three variables every time any of the three change.
		console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
	}
})
```

It works, but we can do better.

Let's say we want to make it more performant: instead of all event handlers
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
		this.emit('change:firstName')
	}

	_lastName = ''
	get lastName() {
		return this._lastName
	}
	set lastName(v) {
		this._lastName = v
		this.emit('change:lastName')
	}

	_age = 0
	get age() {
		return this._age
	}
	set age(v) {
		this._age = v
		this.emit('change:age')
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

const martian = new Martian()

const onChange = () => {
	// Log the three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}

martian.addEventHandler('change:firstName', onChange)
martian.addEventHandler('change:hairColor', onChange)
martian.addEventHandler('change:favoriteFood', onChange)
```

This is better than before because now if other properties besides the ones
we've subscribed to change, the event pattern won't be calling our function
needlessly and we won't be doing property name checks every time.

We can still do better!

We can come up with an automatic event-wiring mechanism. It may be something
like the following:

```js
import {EventEmitter, WithEventProps} from 'events'

// Imagine `WithEventProps` wires up events for the specified properties.

const Martian = WithEventProps(
	class Martian extends EventEmitter {
		static eventProps = [firstName, lastName, age, hairColor, favoriteFood]

		firstName = ''
		lastName = ''
		age = 0
		hairColor = ''
		favoriteFood = ''
	},
)

const martian = new Martian()

const onChange = () => {
	// Log the three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}

martian.addEventHandler('change:firstName', onChange)
martian.addEventHandler('change:hairColor', onChange)
martian.addEventHandler('change:favoriteFood', onChange)
```

That is a lot shorter already, but we can still do better!

We can make it more
[DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) using decorators:

```js
import {EventEmitter, emits} from 'events'

// Imagine `emits` wires up an event for each decorated propertiy.

@emits
class Martian extends EventEmitter {
	@emits firstName = ''
	@emits lastName = ''
	@emits age = 0
	@emits hairColor = ''
	@emits favoriteFood = ''
}

const martian = new Martian()

const onChange = () => {
	// Log the three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}

martian.addEventHandler('change:firstName', onChange)
martian.addEventHandler('change:hairColor', onChange)
martian.addEventHandler('change:favoriteFood', onChange)
```

This is better than before because now we didn't have to repeat the property
names twice. Instead we labeled them all with the a decorator.

---

We can still do better!

With LUME's reactive variables we can further decouple a class's implementation from
the reactivity mechanism and make things cleaner.

We can re-write the previous non-decorator example so that our class does not
need to extend from a particular base class to have reactivity:

```js
import {variable, autorun} from '@lume/variable'

class Martian {
	firstName = variable('')
	lastName = variable('')
	age = variable(0)
	hairColor = variable('')
	favoriteFood = variable('')
}

const martian = new Martian()

autorun(() => {
	// Log the three variables every time any of the three change.
	console.log(martian.firstName(), martian.hairColor(), martian.favoriteFood())
})
```

This is better than before because the reactivity is not an inherent part of
our particular class. We can use the reactivity in our `Matrian` class, or in
any other class, without having class inheritance requirements, and other
developers do not have to make subclasses of our classes just to have
reactivity.

Plus, we did not need to subscribe an event listener to specific
events like we did earlier with the `addEventHandler` calls. Instead, we
wrapped our function with `autorun` and it became a "reactive computation" with
the ability to re-run when its dependencies (the reactive variables used within
it) change.

...We can still do better!...

Using LUME's decorators, the experience is as good as it gets:

```js
import {variable, autorun, reactive} from '@lume/variable'

@reactive
class Martian {
	@reactive firstName = ''
	@reactive lastName = ''
	@reactive age = 0
	@reactive hairColor = ''
	@reactive favoriteFood = ''
}

const martian = new Martian()

autorun(() => {
	// Log the three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
})
```

This is better than before because now we can use the properties like regular
properties instead of having to call them to read their values (like we had to
in the previous example). We can write `this.age` instead of `this.age()` for
reading a value, and `this.age = 10` instead of `this.age(10)` for writing a
value.

It can not get better than this. Well, it actually can, see the API section
(coming soon).

(And actually, things could possibly get simpler if JavaScript (EcmasScript)
were to adopt dependency-tracking reactive computing into the language itself,
but I'll leave that as an exercise for our imagination.)

<details><summary>Ok I couldn't help it. A built-in language feature might look like follows. (Click to open.)</summary>

Perhaps using built-in decorators and an `autorun` keyword:

```js
class Martian {
	@reactive firstName = ''
	@reactive lastName = ''
	@reactive age = 0
	@reactive hairColor = ''
	@reactive favoriteFood = ''
}

const martian = new Martian()

autorun {
	// Log the three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}
```

Or maybe without decorators, only keywords:

```js
class Martian {
	reactive firstName = ''
	reactive lastName = ''
	reactive age = 0
	reactive hairColor = ''
	reactive favoriteFood = ''
}

const martian = new Martian()

autorun {
	// Log the three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}
```

Maybe even we get options to make an autorun synchronous or deferred. If the
previous example was synchronous, then the next one defers re-running to the
next microtask (so that we get a single batched re-run instead of one per
variable change, which has better performance at the cost of making the code
harder to understand or allowing race conditions):

```js
defer autorun {
	// Log the three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}
```

</details>
