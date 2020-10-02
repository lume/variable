// This line should live in @lume/element, but doing that causes Solid to
// exist more than once in node_modules, which causes issues. So because we know
// @lume/element depends on @lume/variable, we stuck these here to avoid the
// duplicate-module issues.
export * from 'solid-js/dom'
