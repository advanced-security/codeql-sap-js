/**
 * @name Entity exposed without authentication
 * @description Entities exposed to external protocols should require an
 *              CDS-based or JS-based access control.
 * @kind problem
 * @problem.severity warning
 * @security-severity 6
 * @precision high
 * @id js/entity-exposed-without-authentication-cds
 * @tags security
 */

import advanced_security.javascript.frameworks.cap.CAPNoAuthzQuery

string getClickableText(CdlElement cdlElement) {
  cdlElement instanceof CdlService and result = "CDS service"
  or
  cdlElement instanceof CdlEntity and result = "CDS entity"
  or
  cdlElement instanceof CdlAction and result = "CDS action"
  or
  cdlElement instanceof CdlFunction and result = "CDS function"
}

from CdlElement cdlElement
where
  cdlElement instanceof CdlElementWithoutJsAuthn and
  cdlElement instanceof CdlElementWithoutCdsAuthn
select cdlElement,
  "The " + getClickableText(cdlElement) + " `" + cdlElement.getName() +
    "` is exposed without any authentication."
