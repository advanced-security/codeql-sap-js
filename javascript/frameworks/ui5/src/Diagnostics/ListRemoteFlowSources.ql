/**
 * @name List all remote sources
 * @description List all remote sources
 * @kind problem
 * @problem.severity info
 * @precision high
 * @id js/ui5-list-remote-flow-sources
 * @tags diagnostics
 */

import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.UI5DataFlow

from RemoteFlowSource source, string type
where type = source.getSourceType()
select source, "Remote flow source of type: " + type
