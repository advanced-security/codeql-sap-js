/**
 * @name UI5 XML model constructors
 * @description Recognizes direct and aliased XML models, distinguishing JSON and unrelated models.
 * @kind table
 * @id test/ui5-xml-model-constructors
 * @tags test
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5DataModels

string modelKind(DataFlow::NewNode construction) {
  if construction instanceof XmlModel
  then result = "xml"
  else
    if construction instanceof JsonModel
    then result = "json"
    else result = "unrelated"
}

from DataFlow::NewNode construction
where construction.getFile().getBaseName() = "App.controller.js"
select construction.getLocation().getStartLine(), modelKind(construction)
