# @lume/variable

Make reactive variables and react to their changes.

#### `npm install @lume/variable --save`

## React to changes in reactive variables

In the following we make a reactive variable `count`, increment its value every
second, and re-run a piece a piece of code that logs the value to the console
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

An autorun with multiple variables will re-run any time any of them change:

```js
autorun(() => {
	// Log the variables every time any of them change.
	console.log(firstName(), lastName(), age(), hairColor())
})
```

## Power and Simplicity

Reactive computations (autoruns) are nice because it doesn't matter how you
group variables (dependencies). What matters is you write what you care about
(expressions using your variables) and don't have to think much about how to
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

You see? With an event pattern we had to figure how to share the function, and
the wire it up to each event emitter.

Let's say we want to add one more item to the console.log statement. Here is how it would be with an autorun:

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

But here's where it gets interesting!

Reactive computations allow us to decouple reactivity implementation from usage
sites, and focus on code we want to write.

Let's say we want to make a class with properties, and abserve any of them. First, let's try a tried-and-true event pattern.

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

Now let's use it to make a class whose poperties we can react to changes of.

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

Cool. Now let's say we wish to react to changes in three of the five properties of a `Martian`:

```js
martian.addEventHandler('change', property => {
	if (['firstName', 'hairColor', 'favoriteFood'].includes(property)) {
		// Log the three variables every time any of the three change.
		console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
	}
})
```

We're in business! It works.

Wait for it, wait for it....

Let's say we want to make it more performant: instead of all event handlers
being subscribed to a single `change` event (because Martians probably have
lots and lots of properties) and having to filter for the events they want, we
can choose specific event names for each property and let handlers be subscribed
to specific property events:

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

There we go, now if other properties besides those ones change, the event
pattern won't be calling our functions and we won't be doing property name
checks all the time.

Alright, so you say we can automate the event wiring, huh?

Well, let me tell ya! Whatever we come up with, it's going to be something like the following:

```js
import {EventEmitter, WithEventProps} from 'events'

// Imagine `WithEventProps` wires up events for the specified properties.

class Martian extends WithEventProps(EventEmitter) {
	static eventProps = [firstName, lastName, age, hairColor, favoriteFood]

	firstName = ''
	lastName = ''
	age = 0
	hairColor = ''
	favoriteFood = ''
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

or if you have use decorators, it might be more like

```js
import {EventEmitter, emits} from 'events'

// Imagine `emits` wires up an event for a decorated propertiy.

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

Not bad. It is already better than before. But you still have the bits of
`addEventHandler` to deal with at the end.

---

What if I told you... that with reactive variables you can decouple the class
implementation from reactivity (no need to extends a particular base class) and
make it all even cleaner?

With LUME's reactive variables, you can write the previous non-decorator
example like the following, without your class having to extend a base class:

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

Nicer and simpler!

But hold on! Hold on! This is the moment you've been waiting for.

Here's what it looks like with decorators:

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

Holy smokes! That is short and clean! And no event listener setup needed at the
end!

(Well, it could get simpler if JavaScript (EcmasScript) were to adopt
dependency-tracking reactive computing into the language itself, but we'll
leave that as an exercise for your imagination.)

<details><summary>Ok I couldn't help it. A built-in language feature might look like this:</summary>

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

Or maybe without decorators, only key words:

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

Maybe even we get options to make it synchronous or deferred. If the previous
example was synchronous, the next one deferrs updates to the next microtask:

```js
defer autorun {
	// Log the three variables every time any of the three change.
	console.log(martian.firstName, martian.hairColor, martian.favoriteFood)
}
```

</details>
