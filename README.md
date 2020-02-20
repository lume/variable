# @lume/variable

Create and react to reactive variables.

#### `npm install @lume/variable --save`

## React to changes in reactive variables

Here's an example that shows how to make a reactive variable, change the
value every second, and make an automatically executed computation that logs
the value of the variable to the console any time the variable changes.

```js
import {variable, autorun} from '@lume/variable'

const count = variable(0)

setInterval(() => count(count() + 1), 1000)

// The function (computation) passed into autorun fires every second due to count being incremented every second.
autorun(() => {
	console.log(count())
})
```

This works because the autorun computation tracks which variables were used,
and tracks those variables "dependencies" or requirements of the computation.
When any dependency of a computation changes, the computation function will
be automatically re-executed.
