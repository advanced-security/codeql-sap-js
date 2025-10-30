/**
 * @name List properties of react modelling
 * @description List properties of react modelling
 * @ kind problem
 * @problem.severity info
 * @precision high
 * @id js/ui5-investigate-react
 * @tags diagnostics
 */

import javascript
import semmle.javascript.security.dataflow.XssThroughDomQuery
import semmle.javascript.security.dataflow.XssThroughDomCustomizations

from DataFlow::Node source
where source instanceof XssThroughDom::Source
select source, ""
