import javascript
import advanced_security.javascript.frameworks.cap.CAPPathInjectionQuery

from DataFlow::Node node, string str, string strfull
where
  node.(UtilsControlledPathSink).toString() = str and strfull = str + ": controlled path sink"
  or
  node.(UtilsAccessedPathSink).toString() = str and strfull = str + ": accessed path sink"
  or
  node.(UtilsControlledDataSink).toString() = str and strfull = str + ": controlled data sink"
select node, strfull
