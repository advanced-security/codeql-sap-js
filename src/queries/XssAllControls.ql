/**
 * @name Client-side cross-site scripting
 * @description Writing user input directly to a UI5 View allows for
 *              a cross-site scripting vulnerability.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 6.1
 * @precision high
 * @id js/ui5-xss
 * @tags security
 *       external/cwe/cwe-079
 *       external/cwe/cwe-116
 */

import javascript
import models.UI5DataFlow::PathGraph
import UI5XssConfiguration

from UI5XssConfiguration cfg, UI5PathNode source, UI5PathNode sink
where cfg.hasFlowPath(source.asDataFlowPathNode(), sink.asDataFlowPathNode())
select sink.getAPrimarySink(), source.getAPrimarySource(), sink.getAPrimarySink(), "XSS vulnerability due to $@.",source.getAPrimarySource(), "user-provided value"
