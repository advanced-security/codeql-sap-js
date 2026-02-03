/**
 * @kind problem
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5

from ManifestJson::ODataDataSourceManifest dataSource
select dataSource, "OData data source '" + dataSource.getName() + "' at " + dataSource.getType()
