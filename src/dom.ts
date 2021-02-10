// This import should live in @lume/element, but doing that causes Solid to exist
// more than once in node_modules, which causes duplicate-module issues. So
// because we know @lume/element depends on @lume/variable, we stuck this here
// to avoid the duplicate-module issues.

import * as _web from 'solid-js/web'

import {getGlobal} from './getGlobal.js'

const global = getGlobal() as any

if (global.SOLID_DOM) {
	// TODO Add a link to a documentation page with more details.
	console.warn(`
        Duplicates of a LUME library or dependency detected, conflict avoided.
        Having duplicates means things may not work as expected if different
        parts of the application are using different instances of something
        that should be a singleton.
    `)
}

// Another strategy to avoid duplicate modules is to store the improted libs on
// a global var. If there are any duplicate modules, they will use the lib that
// is stored on the global var instead of using a lib that is encpsulated in
// (and unique to) their ES Module imports.
const dom: typeof _web = global.SOLID_DOM ?? (global.SOLID_DOM = _web)

export {dom}
