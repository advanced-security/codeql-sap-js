/**
 * @name Access rights to an entity is unnecessarily elevated to privileged
 * @description An entity requiring authorization is being accessed with privileged rights.
 * @kind problem
 * @problem.severity error
 * @security-severity 6
 * @precision high
 * @id js/unnecessarily-granted-privileged-access-rights
 * @tags security
 */

import javascript
import semmle.javascript.dataflow.DataFlow
import advanced_security.javascript.frameworks.cap.CDS

select "TODO", "TODO"
