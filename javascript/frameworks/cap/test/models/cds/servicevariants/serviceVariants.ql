/**
 * @name CAP service definition variants
 * @description Tests service classes, implementation parameters, and CDL events against unrelated constructs.
 * @kind table
 * @id test/cap-service-definition-variants
 * @tags test
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDL
import advanced_security.javascript.frameworks.cap.CDS

string serviceKind(UserDefinedService service) {
  service instanceof ES6BaseServiceDefinition and result = "base"
  or
  service instanceof ES6ApplicationServiceDefinition and result = "application"
  or
  service instanceof ImplMethodCallApplicationServiceDefinition and result = "implementation"
}

from string kind, string value
where
  exists(UserDefinedService service |
    kind = serviceKind(service) and value = service.getLocation().getStartLine().toString()
  )
  or
  exists(ServiceInstanceFromImplMethodCallClosureParameter service |
    kind = "impl-parameter" and
    exists(service.getDefinition()) and
    value = service.getLocation().getStartLine().toString()
  )
  or
  exists(CdlElement element | value = element.getName() |
    if element instanceof CdlEvent
    then kind = element.(CdlEvent).getBasename()
    else kind = "not-event"
  )
select kind, value
