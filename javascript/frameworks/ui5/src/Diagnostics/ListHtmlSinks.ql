/**
 * @name SAP UI5 Html injection sinks
 * @description List all SAP UI5 Html injection sinks
 * @kind problem
 * @problem.severity info
 * @precision high
 * @id js/ui5-list-html-injection-sinks
 * @tags diagnostics
 */

 import javascript
 import advanced_security.javascript.frameworks.ui5.UI5DataFlow 

 from DataFlow::Node sink, string kind
 where
   sink = ModelOutput::getASinkNode(kind).asSink() and
   kind = "ui5-html-injection"
   or
   sink instanceof UI5ModelHtmlISink and
   kind = "ui5-model-sink"
select sink, "SAP UI5 Html injection sink with kind: " + kind