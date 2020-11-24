// These imports should live in @lume/element, but doing that causes Solid to
// exist more than once in node_modules, which causes duplicate-module issues.
// So because we know @lume/element depends on @lume/variable, we stuck these
// imports here to avoid the duplicate-module issues.

import {
	// --- runtime ---
	render as _render,
	renderToString as _renderToString,
	renderDOMToString as _renderDOMToString,
	hydrate as _hydrate,
	template as _template,
	effect as _effect,
	memo as _memo,
	insert as _insert,
	createComponent as _createComponent,
	delegateEvents as _delegateEvents,
	clearDelegatedEvents as _clearDelegatedEvents,
	spread as _spread,
	assign as _assign,
	classList as _classList,
	style as _style,
	currentContext as _currentContext,
	ssr as _ssr,
	ssrClassList as _ssrClassList,
	ssrStyle as _ssrStyle,
	ssrSpread as _ssrSpread,
	escape as _escape,
	getHydrationKey as _getHydrationKey,
	getNextElement as _getNextElement,
	getNextMarker as _getNextMarker,
	generateHydrationEventsScript as _generateHydrationEventsScript,
	// --- Suspense ---
	SuspenseList as _SuspenseList,
	Suspense as _Suspense,
	// --- index ---
	For as _For,
	Show as _Show,
	Switch as _Switch,
	Match as _Match,
	Portal as _Portal,
} from 'solid-js/dom'

import {getGlobal} from './getGlobal'

const global = getGlobal() as any

// If there *do* happen to be duplicate modules for some reason, the modules are
// designed to look for the APIs on global variables, so regardless if each
// duplicate module's ES Module dependencies contain duplicates, only the APIs
// stored on the global vars will be used as the source of truth.
const render = global.solid_render ?? (global.solid_render = _render)
const renderToString = global.solid_renderToString ?? (global.solid_renderToString = _renderToString)
const renderDOMToString = global.solid_renderDOMToString ?? (global.solid_renderDOMToString = _renderDOMToString)
const hydrate = global.solid_hydrate ?? (global.solid_hydrate = _hydrate)
const template = global.solid_template ?? (global.solid_template = _template)
const effect = global.solid_effect ?? (global.solid_effect = _effect)
const memo = global.solid_memo ?? (global.solid_memo = _memo)
const insert = global.solid_insert ?? (global.solid_insert = _insert)
const createComponent = global.solid_createComponent ?? (global.solid_createComponent = _createComponent)
const delegateEvents = global.solid_delegateEvents ?? (global.solid_delegateEvents = _delegateEvents)
const clearDelegatedEvents =
	global.solid_clearDelegatedEvents ?? (global.solid_clearDelegatedEvents = _clearDelegatedEvents)
const spread = global.solid_spread ?? (global.solid_spread = _spread)
const assign = global.solid_assign ?? (global.solid_assign = _assign)
const classList = global.solid_classList ?? (global.solid_classList = _classList)
const style = global.solid_style ?? (global.solid_style = _style)
const currentContext = global.solid_currentContext ?? (global.solid_currentContext = _currentContext)
const ssr = global.solid_ssr ?? (global.solid_ssr = _ssr)
const ssrClassList = global.solid_ssrClassList ?? (global.solid_ssrClassList = _ssrClassList)
const ssrStyle = global.solid_ssrStyle ?? (global.solid_ssrStyle = _ssrStyle)
const ssrSpread = global.solid_ssrSpread ?? (global.solid_ssrSpread = _ssrSpread)
const escape = global.solid_escape ?? (global.solid_escape = _escape)
const getHydrationKey = global.solid_getHydrationKey ?? (global.solid_getHydrationKey = _getHydrationKey)
const getNextElement = global.solid_getNextElement ?? (global.solid_getNextElement = _getNextElement)
const getNextMarker = global.solid_getNextMarker ?? (global.solid_getNextMarker = _getNextMarker)
const generateHydrationEventsScript =
	global.solid_generateHydrationEventsScript ??
	(global.solid_generateHydrationEventsScript = _generateHydrationEventsScript)
const SuspenseList = global.solid_SuspenseList ?? (global.solid_SuspenseList = _SuspenseList)
const Suspense = global.solid_Suspense ?? (global.solid_Suspense = _Suspense)
const For = global.solid_For ?? (global.solid_For = _For)
const Show = global.solid_Show ?? (global.solid_Show = _Show)
const Switch = global.solid_Switch ?? (global.solid_Switch = _Switch)
const Match = global.solid_Match ?? (global.solid_Match = _Match)
const Portal = global.solid_Portal ?? (global.solid_Portal = _Portal)

export {
	// --- runtime ---
	render,
	renderToString,
	renderDOMToString,
	hydrate,
	template,
	effect,
	memo,
	insert,
	createComponent,
	delegateEvents,
	clearDelegatedEvents,
	spread,
	assign,
	classList,
	style,
	currentContext,
	ssr,
	ssrClassList,
	ssrStyle,
	ssrSpread,
	escape,
	getHydrationKey,
	getNextElement,
	getNextMarker,
	generateHydrationEventsScript,
	// --- Suspense ---
	SuspenseList,
	Suspense,
	// --- index ---
	For,
	Show,
	Switch,
	Match,
	Portal,
}
