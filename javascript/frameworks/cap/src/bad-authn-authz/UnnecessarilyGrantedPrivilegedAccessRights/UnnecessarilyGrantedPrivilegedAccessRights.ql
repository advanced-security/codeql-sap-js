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
import advanced_security.javascript.frameworks.cap.CAPUnnecessarilyGrantedPrivilegedAccessRightsQuery

string getMessage(EntityReference entity) {
  entity instanceof LocalEntityReference and
  result = "This transaction is accessing an $@ that requires authorization."
  or
  entity instanceof RemoteEntityReference and
  result = "This transaction is accessing an $@ that may require authorization."
}

from CdsTransaction tx, EntityReference entity
where
  entity = tx.getAnExecutedCqlClause().getAccessingEntityReference() and
  (
    /*
     * 1. A local entity has restricted access control but a transaction to it is
     *    carried out in the context of a privileged user.
     */

    entity.(LocalEntityReference).hasRestrictedAccessControl() and
    tx.getUser().getALocalSource() instanceof PrivilegedUserInstance
    or
    /*
     * 2. An access to a remote entity is carried out in a transaction in the context
     *    of a privileged user.
     */

    entity instanceof RemoteEntityReference and
    tx.getUser().getALocalSource() instanceof PrivilegedUserInstance
  )
select tx, getMessage(entity), entity, "entity"
