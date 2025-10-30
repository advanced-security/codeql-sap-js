/**
 * @name XSJS Zip Slip
 * @description Saving an entry of a zip archive into a file with its stated path
 *              allows for a path traversal and writing to an arbitrary location.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.5
 * @precision medium
 * @id js/xsjs-zip-slip
 * @tags security
 */

import javascript
import advanced_security.javascript.frameworks.xsjs.XSJSZipSlipQuery
import semmle.javascript.frameworks.data.ModelsAsData

module XSJSZipSlipFlow = DataFlow::GlobalWithState<XSJSZipSlip>;

import XSJSZipSlipFlow::PathGraph

from XSJSZipSlipFlow::PathNode source, XSJSZipSlipFlow::PathNode sink
where XSJSZipSlipFlow::flowPath(source, sink)
select sink, source, sink, "The path of $@ being saved depends on a $@.", sink, "this zip file",
  source, "user-provided value"
