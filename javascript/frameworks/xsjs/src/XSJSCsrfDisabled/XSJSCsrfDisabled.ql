/**
 * @name Disabled XSJS CSRF protection
 * @description Disabling CSRF protection makes the application vulnerable to a Cross-Site Request Forgery (CSRF) attack.
 * @kind problem
 * @problem.severity error
 * @security-severity 8.8
 * @precision high
 * @id js/xsjs-disabled-csrf-protection
 * @tags security
 *       external/cwe/cwe-352
 */

import javascript
import advanced_security.javascript.frameworks.xsjs.Xsaccess

from JsonValue value, string msg
where
  value.getJsonFile() instanceof ExposedServiceAccessSpec and
  (
    msg = "CSRF protection should not be disabled." and
    exists(JsonValue v |
      value = v.getPropValue(["prevent_xsrf", "csrfProtection"]) and
      value.getBooleanValue() = false
    )
    or
    // the CSRF protection is missing from .xsaccess
    msg = "CSRF protection is missing from the configuration." and
    value.isTopLevel() and
    value.getJsonFile().getBaseName() = ".xsaccess" and
    not exists(JsonValue p |
      p.getJsonFile() = value.getJsonFile() and
      exists(p.getPropValue("prevent_xsrf"))
    )
  )
select value, msg
