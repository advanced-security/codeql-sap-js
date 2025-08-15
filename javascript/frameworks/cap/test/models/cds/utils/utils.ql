import javascript
import advanced_security.javascript.frameworks.cap.CAPPathInjectionQuery

from DataFlow::Node node, string str, string strfull
where
  node.(UtilsSink).toString() = str and strfull = str + ": sink"
  or
  node.(UtilsExtraFlow).toString() = str and strfull = str + ": additional flow step"
select node, strfull
