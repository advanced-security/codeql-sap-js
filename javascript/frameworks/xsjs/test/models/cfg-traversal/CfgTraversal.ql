/**
 * @name XSJS request/response traversal regression test
 * @description Preserves typed CFG traversal without crossing unrelated function bodies.
 * @kind table
 * @id test/xsjs-cfg-traversal
 * @tags test
 */

import advanced_security.javascript.frameworks.xsjs.AsyncXSJS
import javascript

from XSJSRequestOrResponse reference, XSJSRequestOrResponse adjacent, string kind
where
  (
    reference instanceof XSJSRequest and
    adjacent = reference.(XSJSRequest).getAPredOrSuccRequest() and
    kind = "request"
    or
    reference instanceof XSJSResponse and
    adjacent = reference.(XSJSResponse).getAPredOrSuccResponse() and
    kind = "response"
  )
select kind, reference.getStartLine(), adjacent.getStartLine()
