/**
 * @kind problem
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5

from ManifestJson::ExternalModelManifest model
select model,
  "External model '" + model.getName() + "' with data source '" + model.getDataSourceName() + "'"
