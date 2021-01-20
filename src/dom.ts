// This import should live in @lume/element, but doing that causes Solid to exist
// more than once in node_modules, which causes duplicate-module issues. So
// because we know @lume/element depends on @lume/variable, we stuck this here
// to avoid the duplicate-module issues.

import * as _dom from 'solid-js/dom'

import {getGlobal} from './getGlobal.js'

const global = getGlobal() as any

// Another strategy to avoid duplicate modules is to store the improted libs on
// a global var. If there are any duplicate modules, they will use the lib that
// is stored on the global var instead of using a lib that is encpsulated in
// (and unique to) their ES Module imports.
const dom: typeof _dom = global.SOLID_DOM ?? (global.SOLID_DOM = _dom)

export {dom}
