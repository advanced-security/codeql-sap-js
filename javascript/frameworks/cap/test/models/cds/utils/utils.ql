import javascript
import advanced_security.javascript.frameworks.cap.CDS

from DataFlow::Node node, string str, string strfull
where
  node.(CdsUtils::UtilsSink).toString() = str and strfull = str + ": sink"
  or
  node.(CdsUtils::UtilsExtraFlow).toString() = str and strfull = str + ": additional flow step"
select node, strfull
