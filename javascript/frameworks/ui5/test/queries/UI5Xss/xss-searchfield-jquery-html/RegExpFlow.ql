/**
 * @name Regular expression injection through UI5 sources
 * @description Tests input-control values and regular-expression escaping.
 * @kind table
 * @id test/ui5-regexp-injection-flow
 * @tags test
 */

import javascript
import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import semmle.javascript.security.dataflow.RegExpInjectionQuery as RegExp

from RegExp::RegExpInjectionFlow::PathNode source, RegExp::RegExpInjectionFlow::PathNode sink
where RegExp::RegExpInjectionFlow::flowPath(source, sink)
select sink.getNode().getLocation().getStartLine()
