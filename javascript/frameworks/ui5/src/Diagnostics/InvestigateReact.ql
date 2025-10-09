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
import semmle.javascript.frameworks.React

from ViewComponentInput v
select v, v.getSourceType()
