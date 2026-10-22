/**
 * @name UI5 manifest content node test
 * @description Verifies that manifest model content nodes expose their model and absolute path.
 * @kind table
 * @id test/ui5-manifest-content-nodes
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.UI5DataModels

from ManifestJsonModelContentNode content
select content.getModel(), content.getAbsolutePath()
