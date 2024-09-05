/**
 * @name Broken XSJS authentication
 * @description Disabling XSJS authentication makes the application vulnerable to unauthorized access.
 * @kind problem
 * @problem.severity warning
 * @security-severity 7.5
 * @precision medium
 * @id js/xsjs-broken-authentication
 * @tags security
 *       external/cwe/cwe-306
 */

import javascript
import advanced_security.javascript.frameworks.xsjs.Xsaccess

from JsonValue value, string msg
where
  value.getJsonFile() instanceof ExposedServiceAccessSpec and
  (
    msg = "Authentication should not be disabled." and
    exists(JsonValue v |
      value = v.getPropValue(["authentication", "authenticationMethod", "authenticationType"])
    |
      value.getStringValue() = "none"
      or
      value instanceof JsonNull
    )
    or
    // the authentication specification is missing from .xsaccess
    msg = "Authentication is missing from the configuration." and
    value.isTopLevel() and
    value.getJsonFile().getBaseName() = ".xsaccess" and
    not exists(JsonValue p |
      p.getJsonFile() = value.getJsonFile() and
      exists(p.getPropValue("authentication"))
    )
  )
select value, msg
