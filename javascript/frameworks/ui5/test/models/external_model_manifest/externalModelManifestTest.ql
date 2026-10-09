/**
 * @kind problem
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5DataModels

from ExternalModelManifest model
select model,
  "External model '" + model.getName() + "' with data source '" + model.getDataSourceName() + "'"
