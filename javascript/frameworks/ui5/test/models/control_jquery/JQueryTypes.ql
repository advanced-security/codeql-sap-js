/**
 * @name UI5 jQuery return types
 * @description Checks fluent jQuery return types while excluding getters and DOM or control values.
 * @kind problem
 * @id js/ui5-jquery-return-types-test
 * @tags security
 *       external/cwe/cwe-079
 */

import advanced_security.javascript.frameworks.ui5.UI5ModuleLoader
import javascript

from DataFlow::CallNode call
where
  call.getCalleeNode().asExpr().(VarAccess).getName() = "checkType" and
  (
    call.getArgument(1).getALocalSource() = ModelOutput::getATypeNode("UI5ControlJQuery").asSource()
    or
    call.getArgument(1).getALocalSource() instanceof JQuery::Object
  )
select call.getArgument(0), call.getArgument(0).getStringValue()
