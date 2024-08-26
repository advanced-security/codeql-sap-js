/**
 * @name Default user is privileged
 * @description Overriding the default user to the privileged user allows for authentication bypass.
 * @kind problem
 * @problem.severity error
 * @security-severity 6
 * @precision high
 * @id js/default-user-is-privileged
 * @tags security
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDS

from Assignment overwritingAssignment
where
  exists(CdsUser cdsUser |
    overwritingAssignment.getLhs().flow().getALocalSource() = cdsUser.getDefaultUser() and
    overwritingAssignment.getRhs().flow().getALocalSource() = cdsUser.getPrivilegedUser()
  )
select overwritingAssignment, "The default user is being overridden to a privileged user."
