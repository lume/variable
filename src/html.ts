// @ts-expect-error TODO fix missing types upstream
import html from 'solid-js/html/dist/html.js'

import type HTMLTag from 'solid-js/html'

export default html as typeof HTMLTag

const _html = html as typeof HTMLTag
export {_html as html}
